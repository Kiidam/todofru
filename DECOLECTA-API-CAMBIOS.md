# Cambios y Análisis de la Integración Decolecta (DNI/RUC)

## Visión General
- Se corrigió el reconocimiento de DNI/RUC limpiando entradas a solo dígitos y validando con reglas robustas.
- Se estandarizó el logging usando `src/lib/logger` para trazabilidad.
- Se mejoró el manejo de errores diferenciando problemas de token/autorización del servicio externo.

## Módulo `src/lib/decolecta.ts`
- Reemplazo de `console.*` por `logger` en todas las rutas de ejecución.
- Limpieza de parámetros de entrada en `fetchReniecByDni` y `fetchSunatByRuc` para aceptar formatos con espacios/guiones y normalizar a dígitos.
- Validación de longitud exacta tras la limpieza: DNI `8` y RUC `11`.
- Registro de URL final y respuesta (recortada) para diagnóstico.

## Endpoint `app/api/clientes/ruc/route.ts`
- Normalización del parámetro `ruc`/`numero` a dígitos (`[^0-9]` → vacío) antes de decidir tipo.
- Validación con `ValidacionesService`:
  - DNI: longitud, no ceros, no repetidos, rango.
  - RUC: longitud, no ceros, no repetidos, dígito verificador oficial.
- Respuestas HTTP 400 con mensajes específicos al fallar validación.
- Diferenciación de errores del servicio externo:
  - 401/403 → 502 Bad Gateway con mensaje de token/autorización.
  - Otros códigos → propagación del mensaje original.
- Logs adicionales: entrada cruda, número normalizado, tipo detectado y fuente (BD/RENIEC/SUNAT).

## Servicio `src/services/validaciones.ts`
- Se aprovecharon las validaciones ya implementadas para robustecer el endpoint.
- No se modificó la API pública del servicio.

## Flujo de Procesamiento
1. Recibir `ruc`/`numero` y normalizar a dígitos.
2. Determinar tipo por longitud (8 → DNI, 11 → RUC).
3. Validar con `ValidacionesService` y retornar 400 si falla.
4. Intentar resolver desde BD local.
5. Consultar a Decolecta (`RENIEC`/`SUNAT`) y normalizar respuesta.
6. Registrar logs de cada etapa y retornar payload consistente.

## Formatos y Patrones
- DNI: `^\d{8}$` tras limpieza.
- RUC: `^\d{11}$` tras limpieza; prefijos válidos evaluados en utilidades; dígito verificador validado por servicio.
- Limpieza de entrada: `/[^0-9]/g`.

## Manejo de Errores
- `DecolectaError` con `status` y mensaje informativo.
- Parseo defensivo del body y extracción de `message/error/detail/msg`.
- 401/403 mapeados a 502 con recomendación de revisar `DECOLECTA_API_TOKEN`.

## Logs
- Nivel configurable via `LOG_LEVEL`.
- Trazas clave: petición saliente, respuesta entrante, normalización de datos, fuente de resolución, validaciones.

## Pruebas y Casos
- DNI válidos: `87654321`, `12345678`.
- DNI inválidos: `00000000`, `11111111`, `12-345.678`, `abc12345`.
- RUC válidos: `20123456789`, `10456789012` (prefijo 10: persona natural).
- RUC inválidos: `00000000000`, `11111111111`, `20-123-456-789`, `abc2012345`, dígito verificador incorrecto.
- Retrocompatibilidad: mantiene esquema y rutas actuales; soporte de lectura desde BD local.

## Variables de Entorno
- `DECOLECTA_API_TOKEN` obligatorio.
- `DECOLECTA_BASE_URL` por defecto `https://api.decolecta.pe/v1`.
- `DECOLECTA_SUNAT_URL` y `DECOLECTA_RENIEC_URL` configurables; parámetros `DECOLECTA_SUNAT_PARAM` y `DECOLECTA_RENIEC_PARAM`.

## Impacto
- No se alteró la arquitectura; solo se robusteció validación, logging y manejo de errores.
- El frontend recibe respuestas consistentes con `tipoDocumento`, `tipoEntidad`, `razonSocial`, `direccion` y banderas `esPersonaNatural`/`esActivo`.