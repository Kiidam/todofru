# Actualización: Fallback en GET /api/proveedores

Fecha: 2025-10-24

Resumen
- Se agregó un fallback robusto en el listado de proveedores (GET /api/proveedores) para manejar errores por columnas ausentes (`contacto`/`direccion`) detectados como `P2022` o "unknown column".
- El fallback usa SQL crudo para seleccionar columnas existentes y mantiene paginación y búsqueda básica.

Motivación
- La base de datos presenta drift respecto al schema de Prisma: la columna `contacto` no existe, haciendo fallar consultas `findMany()`.
- Ya había un fallback en POST; ahora el GET también tolera el drift para no romper el flujo UI.

Detalles Técnicos
- Primario: `prisma.proveedor.findMany()` con `include: {_count: ...}` y orden/paginación.
- Fallback: `prisma.$queryRawUnsafe` con `SELECT id, nombre, ruc, telefono, email, direccion, createdAt, activo FROM proveedor ...` y `COUNT(*)` para total.
- Búsqueda: sanitización básica del `search` para evitar inyección.
- Cabeceras: `Cache-Control` conservado (ajuste de s-maxage a 60s).

Impacto en UI
- El dashboard de compras usa solo `id`, `nombre`, `ruc` para poblar el selector; no depende de `_count`, por lo que el fallback no afecta la experiencia.

Pendientes/Recomendación
- Ejecutar el plan de alineación de BD y migraciones descrito en `PROVEEDORES-FIX.md` para restaurar consistencia (añadir `contacto`/`direccion`).
- Tras alinear, el camino primario (Prisma) seguirá funcionando sin el fallback.