# Script de Verificación del Sistema Decolecta
# Ejecutar con: pwsh .\verificar-sistema.ps1

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "🔍 VERIFICACIÓN SISTEMA DECOLECTA" -ForegroundColor Cyan
Write-Host "=====================================`n" -ForegroundColor Cyan

$errores = 0
$warnings = 0

# 1. Verificar que existe .env.local
Write-Host "1. Verificando archivo .env.local..." -ForegroundColor Yellow
if (Test-Path .env.local) {
    Write-Host "   ✅ Archivo .env.local existe" -ForegroundColor Green
    
    # Verificar token
    $content = Get-Content .env.local -Raw
    if ($content -match "DECOLECTA_API_TOKEN=sk_\d+\.") {
        Write-Host "   ✅ Token de Decolecta configurado" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Token de Decolecta no encontrado o inválido" -ForegroundColor Red
        $errores++
    }
} else {
    Write-Host "   ❌ Archivo .env.local no encontrado" -ForegroundColor Red
    $errores++
}

# 2. Verificar schema de Prisma
Write-Host "`n2. Verificando schema de Prisma..." -ForegroundColor Yellow
if (Test-Path prisma\schema.prisma) {
    Write-Host "   ✅ Schema de Prisma existe" -ForegroundColor Green
    
    $schema = Get-Content prisma\schema.prisma -Raw
    if ($schema -match "fechaNacimiento") {
        Write-Host "   ✅ Campo fechaNacimiento presente" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Campo fechaNacimiento no encontrado" -ForegroundColor Yellow
        $warnings++
    }
} else {
    Write-Host "   ❌ Schema de Prisma no encontrado" -ForegroundColor Red
    $errores++
}

# 3. Verificar archivos de componentes
Write-Host "`n3. Verificando componentes..." -ForegroundColor Yellow
$componentPath = "src\components\clientes\NewClientForm.tsx"
if (Test-Path $componentPath) {
    Write-Host "   ✅ NewClientForm.tsx existe" -ForegroundColor Green
    
    $component = Get-Content $componentPath -Raw
    if ($component -match "/api/clientes/ruc") {
        Write-Host "   ✅ Endpoint correcto configurado" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Endpoint incorrecto" -ForegroundColor Red
        $errores++
    }
    
    if ($component -match "console\.log\('🔍") {
        Write-Host "   ✅ Logs de depuración presentes" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Logs de depuración no encontrados" -ForegroundColor Yellow
        $warnings++
    }
} else {
    Write-Host "   ❌ NewClientForm.tsx no encontrado" -ForegroundColor Red
    $errores++
}

# 4. Verificar endpoint de API
Write-Host "`n4. Verificando endpoint de API..." -ForegroundColor Yellow
$apiPath = "app\api\clientes\ruc\route.ts"
if (Test-Path $apiPath) {
    Write-Host "   ✅ Endpoint /api/clientes/ruc existe" -ForegroundColor Green
} else {
    Write-Host "   ❌ Endpoint no encontrado" -ForegroundColor Red
    $errores++
}

# 5. Verificar node_modules
Write-Host "`n5. Verificando dependencias..." -ForegroundColor Yellow
if (Test-Path node_modules) {
    Write-Host "   ✅ Dependencias instaladas" -ForegroundColor Green
} else {
    Write-Host "   ❌ Dependencias no instaladas. Ejecutar: npm install" -ForegroundColor Red
    $errores++
}

# 6. Verificar cliente de Prisma
Write-Host "`n6. Verificando cliente de Prisma..." -ForegroundColor Yellow
if (Test-Path node_modules\.prisma\client) {
    Write-Host "   ✅ Cliente de Prisma generado" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Cliente de Prisma no generado. Ejecutar: npx prisma generate" -ForegroundColor Yellow
    $warnings++
}

# 7. Verificar base de datos
Write-Host "`n7. Verificando conexión a base de datos..." -ForegroundColor Yellow
try {
    $result = npx prisma db execute --stdin <<< "SELECT 1;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Conexión a base de datos exitosa" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  No se pudo verificar la conexión (esto puede ser normal)" -ForegroundColor Yellow
        $warnings++
    }
} catch {
    Write-Host "   ⚠️  No se pudo verificar la conexión" -ForegroundColor Yellow
    $warnings++
}

# 8. Verificar servidor Next.js
Write-Host "`n8. Verificando proceso de Next.js..." -ForegroundColor Yellow
$nextProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*next*dev*" }
if ($nextProcess) {
    Write-Host "   ✅ Servidor Next.js en ejecución" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Servidor Next.js no detectado. Ejecutar: npm run dev" -ForegroundColor Yellow
    $warnings++
}

# Resumen
Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "📊 RESUMEN DE VERIFICACIÓN" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

if ($errores -eq 0 -and $warnings -eq 0) {
    Write-Host "`n✅ Sistema completamente funcional" -ForegroundColor Green
    Write-Host "   Todos los componentes están configurados correctamente" -ForegroundColor Green
    Write-Host "`n🚀 Puedes abrir: http://localhost:3000/dashboard/clientes" -ForegroundColor Cyan
} elseif ($errores -eq 0) {
    Write-Host "`n⚠️  Sistema funcional con advertencias ($warnings)" -ForegroundColor Yellow
    Write-Host "   Revisa las advertencias arriba" -ForegroundColor Yellow
} else {
    Write-Host "`n❌ Sistema con errores ($errores errores, $warnings advertencias)" -ForegroundColor Red
    Write-Host "   Revisa los errores arriba antes de continuar" -ForegroundColor Red
}

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "📝 COMANDOS ÚTILES:" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "npm run dev          - Iniciar servidor" -ForegroundColor White
Write-Host "npx prisma generate  - Generar cliente Prisma" -ForegroundColor White
Write-Host "npx prisma db push   - Sincronizar BD" -ForegroundColor White
Write-Host "npx prisma studio    - Abrir editor de BD" -ForegroundColor White
Write-Host ""
