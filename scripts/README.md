# Scripts de Migración y Pruebas - Todafru

Este directorio contiene scripts esenciales para el mantenimiento, pruebas y migración del sistema Todafru.

## 📋 Scripts Disponibles

### 1. `comprehensive-system-test.js`
**Propósito:** Ejecutar pruebas integrales completas del sistema.

```bash
# Ejecutar todas las pruebas
node scripts/comprehensive-system-test.js
```

**Funcionalidades:**
- ✅ Pruebas de conexión a base de datos
- ✅ Verificación de tablas principales
- ✅ Pruebas CRUD completas (9 modelos)
- ✅ Validación de relaciones e integridad
- ✅ Pruebas de rendimiento
- ✅ Pruebas de validación de unicidad
- ✅ Limpieza automática de datos de prueba

**Salida:** `REPORTE-PRUEBAS-INTEGRALES.json`

### 2. `migration-deploy.js`
**Propósito:** Aplicar optimizaciones y correcciones en el entorno.

```bash
# Aplicar migración
node scripts/migration-deploy.js
```

**Funcionalidades:**
- 🔧 Creación de índices optimizados
- 🔍 Verificación de integridad de datos
- 📁 Creación de directorios necesarios
- ⚙️ Generación de archivos de configuración
- 📊 Pruebas de rendimiento post-migración

**Salida:** `REPORTE-MIGRACION.json`

### 3. `migration-rollback.js`
**Propósito:** Revertir optimizaciones en caso de problemas.

```bash
# Revertir cambios (con confirmación de 5 segundos)
node scripts/migration-rollback.js
```

**Funcionalidades:**
- 🔄 Eliminación de índices optimizados
- 💾 Backup de archivos de configuración
- 🧹 Limpieza de archivos generados
- ✅ Verificación post-rollback

**Salida:** `REPORTE-ROLLBACK.json`

---

## 🚀 Guía de Uso Rápida

### Flujo Completo de Migración

```bash
# 1. Ejecutar pruebas antes de migrar
node scripts/comprehensive-system-test.js

# 2. Aplicar optimizaciones
node scripts/migration-deploy.js

# 3. Verificar que todo funciona
node scripts/comprehensive-system-test.js

# 4. Si hay problemas, revertir
node scripts/migration-rollback.js
```

### Verificación de Estado

```bash
# Ver último reporte de pruebas
cat REPORTE-PRUEBAS-INTEGRALES.json | grep -A 5 "summary"

# Ver último reporte de migración
cat REPORTE-MIGRACION.json | grep -A 5 "summary"
```

---

## 📊 Interpretación de Reportes

### Reporte de Pruebas Integrales
```json
{
  "summary": {
    "totalTests": 18,
    "passedTests": 18,
    "failedTests": 0,
    "status": "EXITOSO"  // EXITOSO | CON ERRORES | FALLIDO
  }
}
```

### Reporte de Migración
```json
{
  "summary": {
    "totalSteps": 6,
    "successfulSteps": 6,
    "failedSteps": 0,
    "status": "SUCCESS"  // SUCCESS | PARTIAL_SUCCESS | FAILED
  }
}
```

---

## ⚠️ Precauciones Importantes

### Antes de Ejecutar en Producción

1. **Backup de Base de Datos**
   ```bash
   mysqldump -u usuario -p todafru_db > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Verificar Conexión**
   ```bash
   # Asegurarse de que las variables de entorno estén configuradas
   echo $DATABASE_URL
   ```

3. **Modo de Mantenimiento**
   - Activar modo de mantenimiento en la aplicación
   - Notificar a usuarios sobre la ventana de mantenimiento

### Durante la Migración

- ⏱️ **Tiempo estimado:** 2-5 minutos
- 📊 **Monitorear:** CPU, memoria y conexiones de BD
- 🔍 **Verificar:** Logs de aplicación en tiempo real

### Después de la Migración

- ✅ **Ejecutar pruebas integrales**
- 📈 **Monitorear rendimiento** por 24-48 horas
- 🔄 **Tener rollback listo** en caso de problemas

---

## 🛠️ Solución de Problemas

### Error: "Cannot connect to database"
```bash
# Verificar conexión
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.\$queryRaw\`SELECT 1\`.then(() => console.log('OK')).catch(console.error);"
```

### Error: "Index already exists"
- ✅ **Normal:** Los scripts manejan índices existentes
- ⚠️ **Verificar:** Que el estado sea "already_exists" en el reporte

### Error: "Permission denied"
```bash
# Verificar permisos de usuario de BD
SHOW GRANTS FOR CURRENT_USER();
```

### Pruebas Fallan Después de Migración
```bash
# Ejecutar rollback inmediatamente
node scripts/migration-rollback.js

# Investigar logs específicos
cat REPORTE-PRUEBAS-INTEGRALES.json | grep -A 10 "ERROR"
```

---

## 📝 Logs y Debugging

### Habilitar Logs Detallados
```bash
# Ejecutar con logs de Prisma
DEBUG=prisma:* node scripts/comprehensive-system-test.js
```

### Archivos de Log Importantes
- `REPORTE-PRUEBAS-INTEGRALES.json` - Resultados de pruebas
- `REPORTE-MIGRACION.json` - Resultados de migración
- `REPORTE-ROLLBACK.json` - Resultados de rollback

### Verificación Manual de Índices
```sql
-- Ver índices creados
SELECT INDEX_NAME, TABLE_NAME 
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = 'todafru_db' 
AND INDEX_NAME LIKE 'idx_%';
```

---

## 🔄 Automatización

### Integración con CI/CD
```yaml
# Ejemplo para GitHub Actions
- name: Run System Tests
  run: node scripts/comprehensive-system-test.js

- name: Apply Migration
  run: node scripts/migration-deploy.js
  if: success()

- name: Verify Migration
  run: node scripts/comprehensive-system-test.js
  if: success()
```

### Cron Jobs para Monitoreo
```bash
# Ejecutar pruebas diarias
0 2 * * * cd /path/to/todafru && node scripts/comprehensive-system-test.js
```

---

## 📞 Soporte

Para problemas con estos scripts:

1. **Revisar logs** en los archivos de reporte JSON
2. **Ejecutar en modo debug** con variables de entorno
3. **Verificar documentación** en `DOCUMENTACION-CAMBIOS.md`
4. **Usar rollback** si es necesario restaurar estado anterior

---

**Última actualización:** 26 de octubre de 2025  
**Versión de scripts:** 1.0  
**Compatibilidad:** Node.js 16+, Prisma 5+