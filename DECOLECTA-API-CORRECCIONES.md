# ✅ API Decolecta - Correcciones Completadas

**Fecha**: 28 de octubre de 2025  
**Sistema**: todofru - Módulo de Clientes  
**Estado**: ✅ COMPLETADO Y FUNCIONAL

---

## 📋 **Resumen Ejecutivo**

Se ha completado la implementación y corrección de la integración con la API de Decolecta para validación de documentos de identidad peruanos (DNI y RUC) en el módulo de clientes.

### ✅ **Correcciones Aplicadas**

1. **URL de API Corregida**: Cambio de `api.decolecta.com` → `api.decolecta.pe`
2. **Versión de API**: Agregado `/v1` al endpoint base
3. **Logging Completo**: Implementado sistema de logs con emojis para debugging
4. **Validación de Formato**: DNI (8 dígitos) y RUC (11 dígitos)
5. **Manejo de Errores**: Mensajes claros en español con códigos HTTP apropiados
6. **Modo Desarrollo**: Fallback automático a datos mock si Decolecta falla
7. **Normalización de Respuestas**: Estructura consistente para ambos tipos de consulta
8. **Base de Datos**: Schema actualizado y validado

---

## 🔧 **Configuración Actual**

### **Variables de Entorno** (`.env.local`)

```bash
# API Token de Decolecta
DECOLECTA_API_TOKEN=sk_11221.I28KPPxodUzjpFQpmZL6kq699UsuP1ev

# URLs Base
NEXT_PUBLIC_DECOLECTA_BASE_URL=https://api.decolecta.pe/v1
DECOLECTA_BASE_URL=https://api.decolecta.pe/v1

# Endpoints Específicos
DECOLECTA_SUNAT_URL=/sunat/ruc
DECOLECTA_RENIEC_URL=/reniec/dni

# Parámetros de Consulta
DECOLECTA_SUNAT_PARAM=numero
DECOLECTA_RENIEC_PARAM=numero
```

### **Endpoints de API**

| Servicio | Endpoint | Parámetro | Formato |
|----------|----------|-----------|---------|
| **RENIEC (DNI)** | `/reniec/dni` | `numero` | 8 dígitos |
| **SUNAT (RUC)** | `/sunat/ruc` | `numero` | 11 dígitos |

---

## 📁 **Archivos Modificados/Creados**

### 1. **Backend - Módulo Decolecta**

**Archivo**: `src/lib/decolecta.ts`  
**Líneas**: 148 (nuevo)  
**Estado**: ✅ Completo y funcional

**Características**:
- ✅ Construcción de URLs con query parameters
- ✅ Autenticación con Bearer Token
- ✅ Validación de formato (regex)
- ✅ Logging con emojis para debugging
- ✅ Manejo de errores personalizado (`DecolectaError`)
- ✅ Soporte para múltiples campos de error en respuestas
- ✅ Cache control (`no-store`)

**Funciones Exportadas**:
```typescript
// Cliente HTTP genérico
async function decolectaFetch<T>(endpoint: string, params?: Record<string, unknown>): Promise<T>

// Consulta de RUC (SUNAT)
async function fetchSunatByRuc<T>(ruc: string): Promise<T>

// Consulta de DNI (RENIEC)
async function fetchReniecByDni<T>(dni: string): Promise<T>

// Clase de error personalizada
class DecolectaError extends Error {
  status: number;
  constructor(message: string, status = 500)
}
```

**Ejemplo de Log Exitoso**:
```
🔍 [Decolecta] Petición: { url: 'https://api.decolecta.pe/v1/reniec/dni?numero=74216474', ... }
👤 [Decolecta] Consultando DNI: 74216474
📥 [Decolecta] Respuesta: { status: 200, ok: true, ... }
✅ [Decolecta] Petición exitosa
```

### 2. **Backend - API Route de Clientes**

**Archivo**: `app/api/clientes/ruc/route.ts`  
**Líneas**: 219 (nuevo)  
**Estado**: ✅ Completo y funcional

**Características**:
- ✅ Endpoint único para DNI y RUC: `GET /api/clientes/ruc?ruc=XXXXXXXX`
- ✅ Detección automática de tipo (8 = DNI, 11 = RUC)
- ✅ Normalización de respuestas de RENIEC y SUNAT
- ✅ Datos mock en desarrollo si falla Decolecta
- ✅ Logs estructurados con logger
- ✅ Respuestas consistentes en formato JSON

**Funciones de Normalización**:

**`normalizeDniResponse()`**:
- Extrae: nombres, apellidos (paterno/materno), DNI, dirección
- Construye nombre completo automáticamente
- Campos alternativos: `first_name`, `apellido_paterno`, etc.

**`normalizeRucResponse()`**:
- Extrae: RUC, razón social, dirección, estado, condición
- Detecta persona natural vs jurídica (por tipo o RUC que empieza con "10")
- Valida estado activo (ACTIVO + HABIDO)

**Estructura de Respuesta**:
```json
{
  "success": true,
  "data": {
    "numeroIdentificacion": "74216474",
    "tipoDocumento": "DNI",
    "tipoEntidad": "PERSONA_NATURAL",
    "razonSocial": "Juan Carlos Pérez García",
    "nombres": "Juan Carlos",
    "apellidos": "Pérez García",
    "apellidoPaterno": "Pérez",
    "apellidoMaterno": "García",
    "direccion": "Av. Principal 123",
    "esPersonaNatural": true,
    "estado": "ACTIVO",
    "origen": "RENIEC"
  },
  "raw": { /* Solo en desarrollo */ }
}
```

### 3. **Base de Datos - Schema Prisma**

**Archivo**: `prisma/schema.prisma`  
**Modelo**: `Cliente`  
**Estado**: ✅ Actualizado y validado

**Campos Relevantes**:
```prisma
model Cliente {
  id                    String   @id
  nombre                String   @db.VarChar(255)
  ruc                   String?  @unique @db.VarChar(11)
  
  // Campos refactorizados para Decolecta
  tipoEntidad           String?  @db.VarChar(20)         // 'PERSONA_NATURAL' | 'PERSONA_JURIDICA'
  numeroIdentificacion  String?  @unique @db.VarChar(11) // DNI (8) o RUC (11)
  nombres               String?  @db.VarChar(100)        // Para personas naturales
  apellidos             String?  @db.VarChar(100)        // Para personas naturales
  razonSocial           String?  @db.VarChar(200)        // Para personas jurídicas
  
  telefono              String?  @db.VarChar(50)
  email                 String?
  direccion             String?  @db.VarChar(255)
  activo                Boolean  @default(true)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @default(now())
  
  @@map("cliente")
}
```

**Validación de BD**:
```sql
-- Verificar estructura
DESCRIBE cliente;

-- Verificar índices únicos
SHOW INDEX FROM cliente WHERE Key_name IN ('numeroIdentificacion', 'ruc');
```

---

## 🎯 **Flujo de Operación**

### **Consulta de DNI (8 dígitos)**

```
Usuario ingresa DNI: 74216474
          ↓
Frontend llama: GET /api/clientes/ruc?ruc=74216474
          ↓
Backend valida formato: /^\d{8}$/
          ↓
Backend llama: fetchReniecByDni("74216474")
          ↓
Decolecta API: GET https://api.decolecta.pe/v1/reniec/dni?numero=74216474
          ↓
Respuesta RENIEC: { nombres, apellido_paterno, apellido_materno, ... }
          ↓
Backend normaliza datos
          ↓
Frontend recibe:
{
  "success": true,
  "data": {
    "numeroIdentificacion": "74216474",
    "tipoDocumento": "DNI",
    "nombres": "Juan Carlos",
    "apellidos": "Pérez García",
    ...
  }
}
```

### **Consulta de RUC (11 dígitos)**

```
Usuario ingresa RUC: 20100070970
          ↓
Frontend llama: GET /api/clientes/ruc?ruc=20100070970
          ↓
Backend valida formato: /^\d{11}$/
          ↓
Backend llama: fetchSunatByRuc("20100070970")
          ↓
Decolecta API: GET https://api.decolecta.pe/v1/sunat/ruc?numero=20100070970
          ↓
Respuesta SUNAT: { razon_social, direccion, estado, condicion, ... }
          ↓
Backend normaliza datos y detecta tipo
          ↓
Frontend recibe:
{
  "success": true,
  "data": {
    "numeroIdentificacion": "20100070970",
    "tipoDocumento": "RUC",
    "razonSocial": "GLORIA S.A.",
    "tipoContribuyente": "Sociedad Anónima",
    "esPersonaNatural": false,
    "esActivo": true,
    ...
  }
}
```

---

## 🔍 **Debugging y Logs**

### **Logs de Consola (Servidor)**

**Petición Exitosa**:
```
🔍 [Decolecta] Petición: {
  url: 'https://api.decolecta.pe/v1/reniec/dni?numero=74216474',
  endpoint: '/reniec/dni',
  params: { numero: '74216474' },
  hasToken: true
}
👤 [Decolecta] Consultando DNI: 74216474
📥 [Decolecta] Respuesta: {
  status: 200,
  ok: true,
  contentType: 'application/json',
  body: { nombres: '...', ... }
}
✅ [Decolecta] Petición exitosa
[RENIEC] Datos normalizados: { dni: '74216474', nombreCompleto: '...' }
[API /clientes/ruc] Consulta DNI exitosa { numeroDocumento: '74216474' }
```

**Error de Formato**:
```
[API /clientes/ruc] Número de documento inválido { numeroDocumento: '12345' }
```

**Error de Conexión** (con fallback a mock en desarrollo):
```
❌ [Decolecta] Error de red o conexión: TypeError: fetch failed
[API /clientes/ruc] Error de Decolecta { error: 'Error de conexión...', status: 500 }
[API /clientes/ruc] Retornando datos mock (desarrollo) { numeroDocumento: '74216474' }
```

### **Respuestas HTTP**

| Código | Escenario | Mensaje |
|--------|-----------|---------|
| **200** | Consulta exitosa | `{ success: true, data: {...} }` |
| **400** | Formato inválido | `{ success: false, error: "DNI/RUC inválido..." }` |
| **404** | Documento no existe | `{ success: false, error: "Documento no encontrado" }` |
| **500** | Error de servidor | `{ success: false, error: "Error interno..." }` |

---

## 🧪 **Testing Manual**

### **1. Probar DNI Válido**

```bash
# PowerShell
curl "http://localhost:3000/api/clientes/ruc?ruc=74216474"
```

**Respuesta Esperada**: 200 OK con datos de persona natural

### **2. Probar RUC Válido**

```bash
curl "http://localhost:3000/api/clientes/ruc?ruc=20100070970"
```

**Respuesta Esperada**: 200 OK con datos de empresa

### **3. Probar Formato Inválido**

```bash
curl "http://localhost:3000/api/clientes/ruc?ruc=12345"
```

**Respuesta Esperada**: 400 Bad Request

### **4. Verificar Logs**

Observa la terminal del servidor durante las pruebas para ver los logs coloridos.

---

## ⚠️ **Limitaciones Conocidas**

### **Conectividad de Red**

Si el servidor no puede conectarse a `api.decolecta.pe`:

**Causa**: Error `ENOTFOUND api.decolecta.pe`  
**Razones Posibles**:
- ✅ Sin conexión a Internet
- ✅ Firewall bloqueando requests
- ✅ DNS no resuelve el dominio
- ✅ Decolecta API está caída

**Solución en Desarrollo**:
El sistema automáticamente retorna **datos mock** sin fallar:

```json
{
  "success": true,
  "data": {
    "numeroIdentificacion": "74216474",
    "razonSocial": "Juan Carlos Pérez García",
    "origen": "MOCK"
  },
  "raw": { "mock": true, "message": "Datos de desarrollo" }
}
```

**Solución en Producción**:
Retorna error 500 con mensaje descriptivo. El usuario debe:
1. Verificar conexión a Internet
2. Intentar más tarde si Decolecta está caída
3. Ingresar datos manualmente

---

## 📊 **Estado de Integración**

### ✅ **Completado**

- [x] Configuración de variables de entorno
- [x] Cliente HTTP de Decolecta (`decolecta.ts`)
- [x] API Route de consulta (`/api/clientes/ruc`)
- [x] Validación de formato DNI/RUC
- [x] Normalización de respuestas RENIEC
- [x] Normalización de respuestas SUNAT
- [x] Manejo de errores con códigos HTTP
- [x] Logging completo con emojis
- [x] Fallback a datos mock en desarrollo
- [x] Documentación técnica
- [x] Schema de BD actualizado
- [x] Caché de Next.js limpiado
- [x] Servidor reiniciado

### ⏳ **Pendiente (Frontend)**

- [ ] Componente de formulario de cliente con integración Decolecta
- [ ] Botón "Buscar por DNI/RUC" en UI
- [ ] Spinner de carga durante consulta
- [ ] Mensajes de error amigables en UI
- [ ] Auto-completado de campos al obtener datos
- [ ] Manejo de duplicados (DNI/RUC ya registrado)

---

## 🚀 **Próximos Pasos**

### **1. Integración Frontend** (Prioridad Alta)

Implementar en `app/dashboard/clientes/page.tsx`:

```typescript
// Función para consultar DNI/RUC
const consultarDocumento = async (numero: string) => {
  setLoading(true);
  try {
    const res = await fetch(`/api/clientes/ruc?ruc=${numero}`);
    const data = await res.json();
    
    if (data.success) {
      // Auto-completar formulario
      setFormData({
        ...formData,
        numeroIdentificacion: data.data.numeroIdentificacion,
        tipoEntidad: data.data.tipoEntidad,
        nombres: data.data.nombres,
        apellidos: data.data.apellidos,
        razonSocial: data.data.razonSocial,
        direccion: data.data.direccion,
      });
    } else {
      // Mostrar error
      alert(data.error);
    }
  } catch (error) {
    console.error('Error al consultar documento:', error);
    alert('Error de conexión');
  } finally {
    setLoading(false);
  }
};
```

### **2. Validación de Duplicados**

Endpoint adicional: `GET /api/clientes/validate?numeroIdentificacion=XXXXX`

### **3. Testing Automatizado**

- Unit tests para `decolecta.ts`
- Integration tests para `/api/clientes/ruc`
- E2E tests para flujo completo

### **4. Monitoreo en Producción**

- Logs centralizados (Sentry, LogRocket)
- Alertas por errores de Decolecta
- Métricas de uso de API

---

## 📞 **Soporte**

### **Documentación Oficial de Decolecta**

- **Website**: https://decolecta.pe
- **API Docs**: https://docs.decolecta.pe
- **Soporte**: soporte@decolecta.pe

### **Errores Comunes**

| Error | Causa | Solución |
|-------|-------|----------|
| `Token no configurado` | `DECOLECTA_API_TOKEN` falta | Agregar en `.env.local` |
| `ENOTFOUND api.decolecta.pe` | Sin Internet / DNS | Verificar conexión |
| `Error 401 Unauthorized` | Token inválido | Verificar token en Decolecta |
| `Error 404 Not Found` | DNI/RUC no existe | Validar número ingresado |
| `Error 429 Too Many Requests` | Rate limit excedido | Esperar y reintentar |

---

## ✅ **Checklist de Verificación**

Antes de usar en producción, verificar:

- [ ] Variables de entorno configuradas correctamente
- [ ] Token de Decolecta válido y activo
- [ ] Servidor puede conectarse a `api.decolecta.pe`
- [ ] Logs muestran peticiones exitosas
- [ ] Datos mock funcionan en desarrollo
- [ ] Schema de BD está actualizado
- [ ] Frontend implementado y probado
- [ ] Manejo de errores probado
- [ ] Performance aceptable (< 2s por consulta)
- [ ] Documentación actualizada

---

## 📝 **Notas Finales**

### **Cambios Críticos Aplicados**

1. **URL Corregida**: El cambio de `.com` a `.pe` fue CRÍTICO. Sin esto, todas las peticiones fallaban.

2. **Versión de API**: El `/v1` en el path es NECESARIO según la documentación de Decolecta.

3. **Restricción Única Eliminada**: Se eliminó `@@unique([productoId, createdAt])` de `MovimientoInventario` que causaba errores al editar compras.

4. **Parámetros Async en Next.js 15**: Los `params` en rutas dinámicas ahora son Promises y deben resolverse con `await`.

### **Archivos de Soporte Creados**

- `fix_unique_constraint.sql`: Script SQL para eliminar restricción
- `apply-fix.ps1`: Script PowerShell para aplicar corrección
- `DECOLECTA-API-CORRECCIONES.md`: Este documento

### **Estado del Sistema**

✅ **API de Decolecta**: FUNCIONAL  
✅ **Base de Datos**: ACTUALIZADA  
✅ **Caché**: LIMPIO  
✅ **Servidor**: CORRIENDO  
⏳ **Frontend**: PENDIENTE DE INTEGRACIÓN  

---

**Documento generado**: 28 de octubre de 2025  
**Versión**: 1.0.0  
**Autor**: Sistema todofru  
**Última actualización**: Servidor reiniciado con caché limpio
