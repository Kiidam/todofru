import fs from 'fs';
import path from 'path';

// Ruta objetivo (normalizada para Windows). Puedes cambiarla si es necesario.
const DEFAULT_TARGET_DIR = path.resolve('c:/Users/Martin/todafru/todofru/app/dashboard/proveedores');
const LOG_DIR = path.resolve('c:/Users/Martin/todafru/todofru/logs');
const LOG_FILE = path.join(LOG_DIR, 'storage.log');

interface LogMeta {
  [key: string]: string | number | boolean | null | undefined;
}

interface WriteAccessResult {
  ok: boolean;
  code?: string;
  error?: Error | NodeJS.ErrnoException;
}

interface DirectoryResult {
  ok: boolean;
  code?: string;
  error?: Error | NodeJS.ErrnoException;
}

interface SaveFileOptions {
  targetDir?: string;
  filename?: string;
  data: Buffer | string;
  maxSizeBytes?: number;
}

interface SaveFileResult {
  ok: boolean;
  path?: string;
  code?: string;
  error?: Error | NodeJS.ErrnoException;
}

function ensureLogsDir(): void {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch {
    // Ignore errors when creating logs directory
  }
}

function log(message: string, meta: LogMeta = {}): void {
  ensureLogsDir();
  const line = `[${new Date().toISOString()}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
  try {
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch (e: unknown) {
    // Si no podemos loguear en archivo, al menos en consola.
    const errorMessage = e instanceof Error ? e.message : 'Error desconocido';
    console.warn('No se pudo escribir log en archivo:', errorMessage);
    console.log(line);
  }
}

function sanitizeFilename(name: string): string {
  // Eliminar caracteres no válidos en Windows y normalizar espacios
  const invalid = /[<>:"/\\|?*]/g;
  const cleaned = String(name).replace(invalid, '_').trim();
  return cleaned.length ? cleaned : `file_${Date.now()}`;
}

function checkWriteAccess(dirPath: string): Promise<WriteAccessResult> {
  return new Promise((resolve) => {
    try {
      fs.access(dirPath, fs.constants.W_OK, (err) => {
        if (err) {
          resolve({ ok: false, code: 'EACCESS', error: err });
        } else {
          resolve({ ok: true });
        }
      });
    } catch (error) {
    const errObj = error instanceof Error ? error : new Error(String(error));
    resolve({ ok: false, code: 'EACCESS_THROW', error: errObj });
    }
  });
}

async function ensureDirectory(dirPath: string): Promise<DirectoryResult> {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true });
    return { ok: true };
  } catch (error: unknown) {
    const errObj = error instanceof Error ? error : new Error(String(error));
    const errorMessage = errObj.message || 'Error desconocido';
    log('Error creando directorio', { dirPath, error: errorMessage });
    return { ok: false, code: 'EMKDIR', error: errObj };
  }
}

async function tryCorrectPermissions(dirPath: string): Promise<void> {
  // En Windows, chmod sólo cambia el flag de sólo lectura. Igualmente intentamos dejarlo escribible.
  try {
    await fs.promises.chmod(dirPath, 0o777);
  } catch (error: unknown) {
    // Ignorar si no es posible; reportar en logs.
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    log('No se pudo aplicar chmod 0777 (Windows/ACL)', { dirPath, error: errorMessage });
  }
}

async function atomicWrite(filePath: string, data: Buffer): Promise<void> {
  const dir = path.dirname(filePath);
  const name = path.basename(filePath);
  const tmp = path.join(dir, `${name}.tmp-${Date.now()}`);
  await fs.promises.writeFile(tmp, data);
  await fs.promises.rename(tmp, filePath);
}

/**
 * Guarda un archivo de proveedor de forma robusta.
 * @param options - Opciones para guardar el archivo
 * @param options.targetDir - Directorio destino. Por defecto: DEFAULT_TARGET_DIR
 * @param options.filename - Nombre de archivo (se sanitiza)
 * @param options.data - Contenido
 * @param options.maxSizeBytes - Tamaño máximo permitido
 * @returns Resultado de la operación
 */
export async function saveProveedorFile(options: SaveFileOptions): Promise<SaveFileResult> {
  const targetDir = path.resolve(options.targetDir || DEFAULT_TARGET_DIR);
  const filename = sanitizeFilename(options.filename || `file_${Date.now()}`);
  const data = typeof options.data === 'string' ? Buffer.from(options.data) : options.data;
  const maxSizeBytes = options.maxSizeBytes || 50 * 1024 * 1024; // 50MB por defecto

  const metaBase = { targetDir, filename, size: data?.length || 0 };
  log('Intentando guardar archivo', metaBase);

  if (!data || !Buffer.isBuffer(data)) {
    const err = { ok: false, code: 'EBAD_DATA', error: new Error('Data inválida o no es Buffer') };
    log('Fallo por datos inválidos', { ...metaBase, code: err.code });
    return err;
  }

  if (data.length > maxSizeBytes) {
    const err = { ok: false, code: 'ETOOBIG', error: new Error(`Tamaño excede máximo: ${maxSizeBytes}`) };
    log('Fallo por tamaño excedido', { ...metaBase, code: err.code });
    return err;
  }

  // 1) Asegurar directorio
  const ensured = await ensureDirectory(targetDir);
  if (!ensured.ok) {
    return ensured;
  }

  // 2) Verificar permisos
  let access = await checkWriteAccess(targetDir);
  if (!access.ok) {
    log('Sin permisos de escritura, intentando corregir', { ...metaBase, code: access.code });
    await tryCorrectPermissions(targetDir);
    access = await checkWriteAccess(targetDir);
  }

  if (!access.ok) {
    log('Persisten problemas de permisos', { ...metaBase, code: access.code, error: String(access.error?.message || access.error) });
    return { ok: false, code: access.code || 'EACCESS_UNKNOWN', error: access.error };
  }

  // 3) Escribir de forma atómica
  const fullPath = path.join(targetDir, filename);
  try {
    await atomicWrite(fullPath, data);
    log('Archivo guardado exitosamente', { path: fullPath });
    return { ok: true, path: fullPath };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    log('Error escribiendo archivo', { ...metaBase, error: errorMessage });
    return { ok: false, code: 'EWRITE', error: error instanceof Error ? error : new Error(String(error)) };
  }
}

export {
  sanitizeFilename,
  ensureDirectory,
  checkWriteAccess,
  tryCorrectPermissions,
  DEFAULT_TARGET_DIR,
  LOG_FILE,
};

const storageUtils = {
  saveProveedorFile,
  sanitizeFilename,
  ensureDirectory,
  checkWriteAccess,
  tryCorrectPermissions,
  DEFAULT_TARGET_DIR,
  LOG_FILE,
};

export default storageUtils;