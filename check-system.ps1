# Script de Verificacion del Sistema Decolecta

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "VERIFICACION SISTEMA DECOLECTA" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

$errores = 0
$warnings = 0

# 1. Verificar .env.local
Write-Host "`n1. Verificando archivo .env.local..." -ForegroundColor Yellow
if (Test-Path .env.local) {
    Write-Host "   [OK] Archivo existe" -ForegroundColor Green
    $content = Get-Content .env.local -Raw
    if ($content -match "DECOLECTA_API_TOKEN") {
        Write-Host "   [OK] Token configurado" -ForegroundColor Green
    } else {
        Write-Host "   [ERROR] Token no encontrado" -ForegroundColor Red
        $errores++
    }
} else {
    Write-Host "   [ERROR] Archivo no encontrado" -ForegroundColor Red
    $errores++
}

# 2. Verificar schema Prisma
Write-Host "`n2. Verificando schema de Prisma..." -ForegroundColor Yellow
if (Test-Path prisma\schema.prisma) {
    Write-Host "   [OK] Schema existe" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] Schema no encontrado" -ForegroundColor Red
    $errores++
}

# 3. Verificar componente
Write-Host "`n3. Verificando NewClientForm..." -ForegroundColor Yellow
if (Test-Path src\components\clientes\NewClientForm.tsx) {
    Write-Host "   [OK] Componente existe" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] Componente no encontrado" -ForegroundColor Red
    $errores++
}

# 4. Verificar endpoint API
Write-Host "`n4. Verificando endpoint API..." -ForegroundColor Yellow
if (Test-Path app\api\clientes\ruc\route.ts) {
    Write-Host "   [OK] Endpoint existe" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] Endpoint no encontrado" -ForegroundColor Red
    $errores++
}

# 5. Verificar dependencias
Write-Host "`n5. Verificando dependencias..." -ForegroundColor Yellow
if (Test-Path node_modules) {
    Write-Host "   [OK] Dependencias instaladas" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] Ejecutar: npm install" -ForegroundColor Red
    $errores++
}

# Resumen
Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "RESUMEN" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Errores: $errores" -ForegroundColor $(if ($errores -eq 0) { "Green" } else { "Red" })
Write-Host "Advertencias: $warnings" -ForegroundColor $(if ($warnings -eq 0) { "Green" } else { "Yellow" })

if ($errores -eq 0) {
    Write-Host "`n[OK] Sistema listo!" -ForegroundColor Green
    Write-Host "Abrir: http://localhost:3000/dashboard/clientes" -ForegroundColor Cyan
} else {
    Write-Host "`n[ERROR] Revisa los errores arriba" -ForegroundColor Red
}

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "COMANDOS UTILES" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "npm run dev          - Iniciar servidor" 
Write-Host "npx prisma generate  - Generar cliente"
Write-Host "npx prisma db push   - Sincronizar BD"
Write-Host ""
