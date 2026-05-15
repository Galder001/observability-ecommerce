# Li Tahi+ Ops Console — Setup en Windows
#
# Ejecutar desde la raíz del proyecto observability-ecommerce
# en PowerShell:  .\ops-console\setup.ps1

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Li Tahi+ Ops Console — Setup Windows" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar Node
Write-Host "[1/5] Verificando Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "  ❌ Node.js no instalado. Descárgalo de https://nodejs.org" -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ Node $nodeVersion" -ForegroundColor Green

# 2. Verificar Ollama
Write-Host "[2/5] Verificando Ollama..." -ForegroundColor Yellow
try {
    $ollamaTest = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -UseBasicParsing -TimeoutSec 3
    Write-Host "  ✅ Ollama responde en :11434" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Ollama no responde. Instálalo de https://ollama.com/download" -ForegroundColor Yellow
    Write-Host "     Luego ejecuta:  ollama pull llama3.1:8b" -ForegroundColor Yellow
}

# 3. Verificar Prometheus
Write-Host "[3/5] Verificando Prometheus..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri "http://localhost:9090/-/ready" -UseBasicParsing -TimeoutSec 3 | Out-Null
    Write-Host "  ✅ Prometheus en :9090" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Prometheus no responde. Arranca el stack:  docker compose up -d" -ForegroundColor Yellow
}

# 4. Verificar Elasticsearch
Write-Host "[4/5] Verificando Elasticsearch..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri "http://localhost:9200" -UseBasicParsing -TimeoutSec 3 | Out-Null
    Write-Host "  ✅ Elasticsearch en :9200" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Elasticsearch no responde." -ForegroundColor Yellow
}

# 5. Instalar dependencias
Write-Host "[5/5] Instalando dependencias npm..." -ForegroundColor Yellow
Push-Location $PSScriptRoot
npm install
Pop-Location

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Setup completado" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Para arrancar en modo desarrollo:" -ForegroundColor White
Write-Host "  cd ops-console" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "Luego abre:  http://localhost:5173" -ForegroundColor White
