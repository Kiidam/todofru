const path = require('path');
const fs = require('fs');
const { saveProveedorFile, DEFAULT_TARGET_DIR, LOG_FILE } = require('../src/lib/storage');

async function main() {
  console.log('📁 Directorio objetivo:', DEFAULT_TARGET_DIR);
  console.log('🪵 Log file:', LOG_FILE);

  const cases = [
    { filename: 'nota.txt', data: Buffer.from('Hola proveedor \n' + new Date().toISOString()) },
    { filename: 'datos.json', data: Buffer.from(JSON.stringify({ proveedor: 'Prueba', ruc: '74216474', ts: Date.now() }, null, 2)) },
    { filename: 'binario-1mb.bin', data: Buffer.alloc(1 * 1024 * 1024, 7) },
    { filename: 'binario-10mb.bin', data: Buffer.alloc(10 * 1024 * 1024, 3) },
  ];

  for (const c of cases) {
    console.log(`\n▶️ Guardando: ${c.filename} (${c.data.length} bytes)`);
    const res = await saveProveedorFile({ filename: c.filename, data: c.data });
    if (!res.ok) {
      console.error('❌ Falló guardado', { code: res.code, error: String(res.error?.message || res.error) });
    } else {
      console.log('✅ Guardado en:', res.path);
    }
  }

  // Caso de error: tamaño excesivo
  console.log('\n▶️ Probando tamaño excesivo (60MB)');
  const big = Buffer.alloc(60 * 1024 * 1024, 1);
  const resBig = await saveProveedorFile({ filename: 'muy-grande.bin', data: big, maxSizeBytes: 50 * 1024 * 1024 });
  if (!resBig.ok) {
    console.log('🧪 Esperado error por tamaño:', resBig.code);
  } else {
    console.log('⚠️ No esperado: se guardó archivo muy grande en', resBig.path);
  }

  // Mostrar contenido del directorio
  console.log('\n📜 Listado del directorio destino:');
  try {
    const files = await fs.promises.readdir(DEFAULT_TARGET_DIR);
    for (const f of files) console.log('•', f);
  } catch (e) {
    console.error('No se pudo listar el directorio destino:', e.message);
  }

  console.log('\n🔎 Revisa el log en:', LOG_FILE);
}

main().catch((e) => {
  console.error('Error en test-storage:', e);
  process.exit(1);
});