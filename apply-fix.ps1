# Script para aplicar la corrección de la base de datos
# Elimina la restricción única problemática en MovimientoInventario

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Corrigiendo Base de Datos - MovimientoInventario" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Ruta a MySQL (ajusta según tu instalación)
$mysqlPaths = @(
    "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe",
    "C:\xampp\mysql\bin\mysql.exe",
    "C:\wamp64\bin\mysql\mysql8.0.31\bin\mysql.exe",
    "C:\laragon\bin\mysql\mysql-8.0.30-winx64\bin\mysql.exe"
)

$mysqlPath = $null
foreach ($path in $mysqlPaths) {
    if (Test-Path $path) {
        $mysqlPath = $path
        Write-Host "✅ MySQL encontrado en: $path" -ForegroundColor Green
        break
    }
}

if (-not $mysqlPath) {
    Write-Host "❌ No se encontró MySQL. Por favor, instala MySQL o ajusta la ruta en el script." -ForegroundColor Red
    Write-Host ""
    Write-Host "Rutas buscadas:" -ForegroundColor Yellow
    foreach ($path in $mysqlPaths) {
        Write-Host "  - $path" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "Solución alternativa:" -ForegroundColor Yellow
    Write-Host "  1. Abre MySQL Workbench o tu cliente MySQL favorito" -ForegroundColor White
    Write-Host "  2. Conecta a la base de datos 'todofru'" -ForegroundColor White
    Write-Host "  3. Ejecuta este comando:" -ForegroundColor White
    Write-Host ""
    Write-Host "     ALTER TABLE movimientoinventario DROP INDEX uq_mi_producto_fecha;" -ForegroundColor Cyan
    Write-Host ""
    Read-Host "Presiona Enter para salir"
    exit 1
}

Write-Host ""
Write-Host "Ejecutando corrección..." -ForegroundColor Yellow

$sqlCommand = @"
USE todofru;
ALTER TABLE movimientoinventario DROP INDEX IF EXISTS uq_mi_producto_fecha;
SELECT 'Restricción eliminada exitosamente' AS resultado;
"@

try {
    $password = "280820"
    $result = & $mysqlPath -u root -p"$password" -e $sqlCommand 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Base de datos actualizada exitosamente" -ForegroundColor Green
        Write-Host ""
        Write-Host "Resultado:" -ForegroundColor Cyan
        Write-Host $result
        Write-Host ""
        Write-Host "Ahora puedes:" -ForegroundColor Yellow
        Write-Host "  1. El servidor de desarrollo debería detectar el cambio automáticamente" -ForegroundColor White
        Write-Host "  2. Prueba editar una compra nuevamente" -ForegroundColor White
        Write-Host "  3. El error 500 debería estar resuelto" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "⚠️  Hubo un problema al ejecutar el comando" -ForegroundColor Yellow
        Write-Host "Error:" -ForegroundColor Red
        Write-Host $result
        Write-Host ""
        Write-Host "Ejecuta manualmente en MySQL:" -ForegroundColor Yellow
        Write-Host "  ALTER TABLE movimientoinventario DROP INDEX uq_mi_producto_fecha;" -ForegroundColor Cyan
    }
} catch {
    Write-Host ""
    Write-Host "❌ Error al ejecutar el comando:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Ejecuta manualmente en MySQL:" -ForegroundColor Yellow
    Write-Host "  ALTER TABLE movimientoinventario DROP INDEX uq_mi_producto_fecha;" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Read-Host "Presiona Enter para continuar"
