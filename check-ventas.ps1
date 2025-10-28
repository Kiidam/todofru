#!/usr/bin/env pwsh
# Script de verificación para el sistema de ventas TODAFRU

Write-Host "`n=== 🛒 VERIFICACIÓN DEL SISTEMA DE VENTAS ===" -ForegroundColor Cyan
Write-Host ""

$errores = 0
$advertencias = 0

# 1. Verificar archivo de página de ventas
Write-Host "Verificando componente de ventas..." -NoNewline
$ventasFile = "app\dashboard\movimientos\ventas\page.tsx"
if (Test-Path $ventasFile) {
    Write-Host " [OK]" -ForegroundColor Green
    
    # Verificar que use el endpoint correcto
    $content = Get-Content $ventasFile -Raw
    if ($content -match "/api/productos") {
        Write-Host "  ✓ Endpoint de productos correcto (/api/productos)" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Endpoint de productos incorrecto" -ForegroundColor Red
        $errores++
    }
    
    if ($content -match "/api/clientes") {
        Write-Host "  ✓ Endpoint de clientes correcto (/api/clientes)" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Endpoint de clientes incorrecto" -ForegroundColor Red
        $errores++
    }
    
    if ($content -match "/api/pedidos-venta") {
        Write-Host "  ✓ Endpoint de pedidos correcto (/api/pedidos-venta)" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Endpoint de pedidos incorrecto" -ForegroundColor Red
        $errores++
    }
    
    if ($content -match "console\.log") {
        Write-Host "  ✓ Logs de debugging presentes" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ No se encontraron logs de debugging" -ForegroundColor Yellow
        $advertencias++
    }
} else {
    Write-Host " [FALTA]" -ForegroundColor Red
    Write-Host "  ✗ No se encuentra el archivo: $ventasFile" -ForegroundColor Red
    $errores++
}

# 2. Verificar API de productos
Write-Host "`nVerificando API de productos..." -NoNewline
$productosApi = "app\api\productos\route.ts"
if (Test-Path $productosApi) {
    Write-Host " [OK]" -ForegroundColor Green
} else {
    Write-Host " [FALTA]" -ForegroundColor Red
    $errores++
}

# 3. Verificar API de clientes
Write-Host "Verificando API de clientes..." -NoNewline
$clientesApi = "app\api\clientes\route.ts"
if (Test-Path $clientesApi) {
    Write-Host " [OK]" -ForegroundColor Green
} else {
    Write-Host " [FALTA]" -ForegroundColor Red
    $errores++
}

# 4. Verificar API de pedidos-venta
Write-Host "Verificando API de pedidos-venta..." -NoNewline
$pedidosApi = "app\api\pedidos-venta\route.ts"
if (Test-Path $pedidosApi) {
    Write-Host " [OK]" -ForegroundColor Green
} else {
    Write-Host " [FALTA]" -ForegroundColor Red
    $errores++
}

# 5. Verificar schema de Prisma
Write-Host "`nVerificando schema de Prisma..." -NoNewline
$schema = "prisma\schema.prisma"
if (Test-Path $schema) {
    Write-Host " [OK]" -ForegroundColor Green
    
    $schemaContent = Get-Content $schema -Raw
    if ($schemaContent -match "model PedidoVenta") {
        Write-Host "  ✓ Modelo PedidoVenta presente" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Modelo PedidoVenta no encontrado" -ForegroundColor Red
        $errores++
    }
    
    if ($schemaContent -match "model PedidoVentaItem") {
        Write-Host "  ✓ Modelo PedidoVentaItem presente" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Modelo PedidoVentaItem no encontrado" -ForegroundColor Red
        $errores++
    }
    
    if ($schemaContent -match "model MovimientoInventario") {
        Write-Host "  ✓ Modelo MovimientoInventario presente" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Modelo MovimientoInventario no encontrado" -ForegroundColor Red
        $errores++
    }
} else {
    Write-Host " [FALTA]" -ForegroundColor Red
    $errores++
}

# 6. Verificar node_modules
Write-Host "`nVerificando dependencias..." -NoNewline
if (Test-Path "node_modules") {
    Write-Host " [OK]" -ForegroundColor Green
} else {
    Write-Host " [FALTA]" -ForegroundColor Red
    Write-Host "  ⚠ Ejecutar: npm install" -ForegroundColor Yellow
    $advertencias++
}

# 7. Verificar .env.local
Write-Host "Verificando configuración..." -NoNewline
if (Test-Path ".env.local") {
    Write-Host " [OK]" -ForegroundColor Green
    
    $env = Get-Content ".env.local" -Raw
    if ($env -match "DATABASE_URL") {
        Write-Host "  ✓ DATABASE_URL configurado" -ForegroundColor Green
    } else {
        Write-Host "  ✗ DATABASE_URL no encontrado" -ForegroundColor Red
        $errores++
    }
    
    if ($env -match "NEXTAUTH_SECRET") {
        Write-Host "  ✓ NEXTAUTH_SECRET configurado" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ NEXTAUTH_SECRET no encontrado" -ForegroundColor Yellow
        $advertencias++
    }
} else {
    Write-Host " [FALTA]" -ForegroundColor Red
    $errores++
}

# Resumen
Write-Host "`n=== RESUMEN ===" -ForegroundColor Cyan
Write-Host "Errores: $errores" -ForegroundColor $(if ($errores -eq 0) { "Green" } else { "Red" })
Write-Host "Advertencias: $advertencias" -ForegroundColor $(if ($advertencias -eq 0) { "Green" } else { "Yellow" })

if ($errores -eq 0 -and $advertencias -eq 0) {
    Write-Host "`n✅ Sistema de ventas listo!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Pasos siguientes:" -ForegroundColor Cyan
    Write-Host "  1. Iniciar servidor: npm run dev" -ForegroundColor White
    Write-Host "  2. Abrir: http://localhost:3000/dashboard/movimientos/ventas" -ForegroundColor White
    Write-Host "  3. Abrir DevTools (F12) > Consola" -ForegroundColor White
    Write-Host "  4. Hacer clic en 'Registrar venta'" -ForegroundColor White
    Write-Host "  5. Verificar que aparezcan productos y clientes en los selectores" -ForegroundColor White
    Write-Host ""
} elseif ($errores -eq 0) {
    Write-Host "`n⚠️  Sistema funcional con advertencias" -ForegroundColor Yellow
    Write-Host "Revisa las advertencias arriba" -ForegroundColor Yellow
} else {
    Write-Host "`n❌ Sistema requiere correcciones" -ForegroundColor Red
    Write-Host "Revisa los errores arriba antes de continuar" -ForegroundColor Red
}

Write-Host ""
