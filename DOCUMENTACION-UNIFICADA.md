# Documentación Unificada TODOFRU

Esta guía consolida las instrucciones críticas del proyecto TODOFRU para operar, configurar y mantener el sistema con texto legible y estándares consistentes.

## Índice
- 1. Acceso y Arranque Rápido
- 2. Configuración Base (Env, MySQL, Prisma)
- 3. Autenticación JWT (Verificación y Pruebas)
- 4. UI/UX Legibilidad y Modales (Reglas Obligatorias)
- 5. Iconos UI/UX (Mapeo y Ejemplo)
- 6. Sincronización Producto-Inventario (Flujos y Endpoints)
- 7. Migración a MySQL (Resumen y Comandos)
- 8. Correcciones TS y Accesibilidad (Checklist)
- 9. Estado del Sistema y Recuperación (Enero 2025)
- 10. Protocolo de Edición Segura
- 11. Soporte

---

## 1. Acceso y Arranque Rápido
- Credenciales de desarrollo: `admin@todafru.com` / `admin123`.
- URLs: `http://localhost:3000/login` y `http://localhost:3000/dashboard` (ajustar puerto si es diferente).
- Arranque:
  - Desarrollo: `npm run dev`.
  - Producción: `npm run build` y `npm run start`.
- Datos demo (opcional): ejecutar `todofru/scripts/sample-data.sql` desde MySQL Workbench.

## 2. Configuración Base (Env, MySQL, Prisma)
- `.env` ejemplo:
  - `DATABASE_URL="mysql://root:<tu_password>@localhost:3306/todofru"`
  - `NEXTAUTH_SECRET="cambiar-en-produccion"`
  - `NEXTAUTH_URL="http://localhost:3000"`
- Base de datos:
  - Crear `todofru` y aplicar migraciones: `npx prisma migrate dev --name init`.
  - Generar cliente: `npx prisma generate`.
  - Seed: `npm run db:seed`.
- Comandos útiles:
  - `npx prisma studio` (inspección DB), `npm run type-check`, `npm run lint`.

## 3. Autenticación JWT (Verificación y Pruebas)
- Estado: JWT operativo con NextAuth en `/api/auth/*`.
- Pruebas:
  - Manual: login, acceder a `/dashboard`, validar sesión.
  - Automatizada: visitar `http://localhost:3001/test-jwt` si el servidor corre en ese puerto.
- Características:
  - Tokens firmados, CSRF activo, sesiones JWT, expiración de tokens.
  - Datos en token: `id`, `email`, `role`; callbacks personalizados.

## 4. UI/UX Legibilidad y Modales (Reglas Obligatorias)
- Legibilidad crítica:
  - Texto principal: `text-gray-900`.
  - Formularios y modales: `bg-white`, inputs con `text-gray-900 bg-white`.
  - Placeholders: color visible (ej. `#6B7280`/`#8a8a8a`).
- Superposición obligatoria:
  - Estructura base del modal:
```
{showModal && (
  <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
      {/* Contenido */}
    </div>
  </div>
)}
```
- Errores a evitar:
  - No cambiar la vista completa al abrir modal.
  - No usar `text-gray-400`/`text-gray-300` en texto principal.
  - No duplicar botón “X” en el header: el componente `Modal` ya lo incluye.
- Clases recomendadas:
  - Labels: `block text-sm font-medium text-gray-900`.
  - Inputs: `w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white focus:ring-2 focus:ring-green-500`.

## 5. Iconos UI/UX (Mapeo y Ejemplo)
- Mapeo de acciones:
  - Ver: `Eye` (gris oscuro), Editar: `Edit2` (azul), Activar: `CheckCircle` (verde), Desactivar: `Ban` (amarillo), Eliminar: `Trash2` (rojo), Imprimir: `Printer`, Exportar: `FileDown`, Importar: `FileUp`.
- Ejemplo estándar de celda de acciones:
```
<div className="flex items-center space-x-3">
  <button onClick={onEdit} className="text-blue-600 hover:text-blue-800" title="Editar" aria-label="Editar">
    <Edit2 className="h-5 w-5" />
  </button>
  <button onClick={onToggle} className={isActive ? 'text-yellow-600 hover:text-yellow-800' : 'text-green-600 hover:text-green-800'} title={isActive ? 'Desactivar' : 'Activar'} aria-label={isActive ? 'Desactivar' : 'Activar'}>
    {isActive ? <Ban className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
  </button>
  <button onClick={onDelete} className="text-red-600 hover:text-red-800" title="Eliminar" aria-label="Eliminar">
    <Trash2 className="h-5 w-5" />
  </button>
</div>
```

## 6. Sincronización Producto-Inventario (Flujos y Endpoints)
- Principios:
  - Catálogo de productos es la única fuente válida.
  - Productos inactivos no admiten nuevos movimientos.
  - Validaciones estrictas previo a cada movimiento.
- Endpoints:
  - `GET /api/productos/sync-validation` (reporte de sincronización).
  - `POST /api/productos/sync-validation` con `{"action":"migrate"|"clean"}`.
- Acciones:
  - Migrar productos huérfanos al catálogo o limpiar movimientos huérfanos (con backup previo).
- UI:
  - Panel de advertencias en inventario; eliminación protegida en productos.

## 7. Migración a MySQL (Resumen y Comandos)
- Estado: migración completada con 27 tablas y seed listo.
- `.env` actualizado y `prisma/schema.prisma` con `provider = "mysql"`.
- Comandos:
```
Remove-Item -Recurse -Force .\prisma\migrations
npx prisma generate
npx prisma migrate dev --name init_mysql
npm run db:seed
node scripts/verify-mysql.js
```
- Acceso: `http://localhost:3000/login` (admin/admin123).

## 8. Correcciones TS y Accesibilidad (Checklist)
- Pedidos de Compra:
  - Agregar `fecha` por defecto en `FormData` y en resets.
  - Inputs dinámicos con `aria-label` y placeholders descriptivos.
- Cuentas por Cobrar:
  - Import del `Modal` corregido a la ruta válida.
- Validaciones finales:
  - `npm run build` sin errores, formularios accesibles, CRUDs funcionales.

## 9. Estado del Sistema y Recuperación (Enero 2025)
- Resumen:
  - Errores: 1,242+ (TypeScript) en reporte histórico.
  - Módulos críticos: Pedidos de Compra (null references), Cuentas por Cobrar (archivo eliminado).
- Recuperación:
  - Fase 1: Documentar, eliminar archivos corruptos, recrear módulos críticos.
  - Fase 2: Validaciones estrictas y testing por módulo.
  - Fase 3: Prevención (pre-commit hooks, ESLint, plantillas validadas).

## 10. Protocolo de Edición Segura
- Una edición a la vez y validar inmediatamente (`npm run build`).
- Backup antes de cambios (`cp archivo.tsx archivo.backup.tsx`).
- Usar módulos de referencia (ej. `app/dashboard/productos/page.tsx`).
- Evitar duplicar layouts en `app/` y `src/`.

## 11. Soporte
- Correo: `admin@todafru.com`.
- En reportes incluir: captura, acción, hora y navegador.

---

Referencias completas: `README.md`, `README-access.md`, `JWT-VERIFICATION-REPORT.md`, `MYSQL-MIGRATION-REPORT.md`, `PRODUCTO-INVENTARIO-SYNC.md`, `GUIA_MODALES_UI_UX.md`, `GUIA_ICONOS_UI_UX.md`, `GUIA_TABLAS_UI_UX.md`, `CORRECTION-GUIDE.md`, `ERRORES-SISTEMA-ENERO-2025.md`.