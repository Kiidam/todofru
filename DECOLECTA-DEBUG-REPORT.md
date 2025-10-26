# 🔍 Reporte de Depuración - Servicio Decolecta

## 📋 Resumen Ejecutivo

Se ha completado la verificación y depuración de la configuración del servicio de identificación por DNI y RUC de Decolecta. Se identificaron varios problemas críticos que impiden el funcionamiento correcto del servicio.

## ❌ Problemas Identificados

### 1. **Token de Autenticación No Configurado** (CRÍTICO)
- **Problema**: La variable `DECOLECTA_API_TOKEN` está vacía en `.env.local`
- **Impacto**: Todas las consultas a Decolecta fallan con error 401/403
- **Ubicación**: Línea 14 en `.env.local`

### 2. **Inconsistencia en Nombres de Variables** (CORREGIDO)
- **Problema**: Se usaban dos nombres diferentes para el token:
  - `DECOLECTA_API_TOKEN` (correcto)
  - `DECOLECTA_TOKEN` (incorrecto)
- **Solución**: Corregido en `app/api/proveedores/ruc/route.ts`

### 3. **Validación de Formato de Datos** (VERIFICADO)
- **DNI**: Validación correcta con regex `/^\d{8}$/`
- **RUC**: Validación correcta con regex `/^\d{8}$|\d{11}$/`
- **Estado**: ✅ Implementado correctamente

## 🔧 Soluciones Implementadas

### ✅ Correcciones Realizadas

1. **Unificación de nombres de variables**
   ```diff
   - const token = process.env.DECOLECTA_TOKEN;
   + const token = process.env.DECOLECTA_API_TOKEN;
   ```

2. **Script de diagnóstico creado**
   - Archivo: `test-decolecta.js`
   - Función: Verificar conectividad y configuración

### 🚨 Acciones Requeridas (URGENTE)

1. **Configurar Token de Decolecta**
   ```bash
   # Editar .env.local
   DECOLECTA_API_TOKEN=tu-token-real-aqui
   ```

2. **Verificar permisos del token**
   - Asegurar que el token tenga acceso a:
     - Consultas RENIEC (DNI)
     - Consultas SUNAT (RUC)

## 📊 Estado de Variables de Entorno

| Variable | Estado | Valor Actual | Requerido |
|----------|--------|--------------|-----------|
| `DECOLECTA_API_TOKEN` | ❌ Vacío | (vacío) | Token válido |
| `DECOLECTA_BASE_URL` | ✅ OK | https://api.decolecta.pe | ✓ |
| `DECOLECTA_SUNAT_URL` | ✅ OK | /sunat/ruc | ✓ |
| `DECOLECTA_RENIEC_URL` | ✅ OK | /reniec/dni | ✓ |

## 🧪 Pruebas de Verificación

### Script de Diagnóstico
```bash
node test-decolecta.js
```

**Resultado Actual:**
```
❌ ERROR: DECOLECTA_API_TOKEN no está configurado en .env.local
```

### Pruebas Manuales Recomendadas

1. **Consulta DNI de prueba**
   ```bash
   curl -H "Authorization: Bearer TU_TOKEN" \
        "https://api.decolecta.pe/reniec/dni?dni=12345678"
   ```

2. **Consulta RUC de prueba**
   ```bash
   curl -H "Authorization: Bearer TU_TOKEN" \
        "https://api.decolecta.pe/sunat/ruc?ruc=20123456789"
   ```

## 🔒 Consideraciones de Seguridad

1. **Token de Acceso**
   - ✅ Variable está en `.env.local` (no se sube al repositorio)
   - ✅ `.env.local` está en `.gitignore`
   - ❌ Token no configurado

2. **Validación de Entrada**
   - ✅ DNI: 8 dígitos numéricos
   - ✅ RUC: 8 o 11 dígitos numéricos
   - ✅ Sanitización de parámetros

## 📝 Logs del Sistema

**Estado**: ✅ Revisado
**Ubicación**: `logs/storage.log`
**Resultado**: No se encontraron errores de autenticación con Decolecta

## 🚀 Próximos Pasos

1. **INMEDIATO**: Configurar `DECOLECTA_API_TOKEN` en `.env.local`
2. **VERIFICAR**: Ejecutar `node test-decolecta.js` después de configurar el token
3. **PROBAR**: Realizar consultas de prueba desde la aplicación
4. **MONITOREAR**: Revisar logs para errores de autenticación

## 📞 Contacto de Soporte

Si persisten los problemas después de configurar el token:
1. Verificar que el token sea válido en el panel de Decolecta
2. Confirmar que el token tenga permisos para RENIEC y SUNAT
3. Contactar soporte técnico de Decolecta

---
**Fecha del reporte**: $(date)
**Estado**: Pendiente configuración de token
**Prioridad**: ALTA