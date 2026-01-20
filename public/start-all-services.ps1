# Script para iniciar Frontend, Backend e Cloudflare Tunnel
# Execute: .\start-all-services.ps1

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Iniciando todos os serviços..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Caminhos
$frontendPath = "C:\Users\Rafael Machado\Downloads\Frontend\public"
$backendPath = "C:\Users\Rafael Machado\Downloads\Backend\prisma"
$cloudflaredPath = "$env:LOCALAPPDATA\cloudflared\cloudflared.exe"

# Verificar se os caminhos existem
Write-Host "Verificando caminhos..." -ForegroundColor Yellow

if (-not (Test-Path $frontendPath)) {
    Write-Host "ERRO: Pasta do frontend não encontrada: $frontendPath" -ForegroundColor Red
    Read-Host "Pressione Enter para sair"
    exit 1
}

if (-not (Test-Path $backendPath)) {
    Write-Host "ERRO: Pasta do backend não encontrada: $backendPath" -ForegroundColor Red
    Read-Host "Pressione Enter para sair"
    exit 1
}

if (-not (Test-Path $cloudflaredPath)) {
    Write-Host "ERRO: cloudflared não encontrado: $cloudflaredPath" -ForegroundColor Red
    Write-Host "Instale o cloudflared primeiro." -ForegroundColor Yellow
    Read-Host "Pressione Enter para sair"
    exit 1
}

Write-Host "Todos os caminhos verificados!" -ForegroundColor Green
Write-Host ""

# Limpar portas antes de iniciar
Write-Host "Verificando portas em uso..." -ForegroundColor Yellow
$port3000 = netstat -ano | findstr :3000 | findstr LISTENING
$port3001 = netstat -ano | findstr :3001 | findstr LISTENING
$port3333 = netstat -ano | findstr :3333 | findstr LISTENING

if ($port3000) {
    $processId = ($port3000 -split '\s+')[-1]
    Write-Host "  Encerrando processo na porta 3000 (PID: $processId)..." -ForegroundColor Yellow
    taskkill /PID $processId /F 2>$null
}

if ($port3001) {
    $processId = ($port3001 -split '\s+')[-1]
    Write-Host "  Encerrando processo na porta 3001 (PID: $processId)..." -ForegroundColor Yellow
    taskkill /PID $processId /F 2>$null
}

if ($port3333) {
    $processId = ($port3333 -split '\s+')[-1]
    Write-Host "  Encerrando processo na porta 3333 (PID: $processId)..." -ForegroundColor Yellow
    taskkill /PID $processId /F 2>$null
}

if ($port3000 -or $port3001 -or $port3333) {
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "[1/3] Iniciando Backend (porta 3333)..." -ForegroundColor Green
try {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; Write-Host '=== BACKEND (porta 3333) ===' -ForegroundColor Yellow; npm run dev"
    Start-Sleep -Seconds 2
    Write-Host "  Backend iniciado!" -ForegroundColor Green
} catch {
    Write-Host "  ERRO ao iniciar backend: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "[2/3] Iniciando Frontend (porta 3001)..." -ForegroundColor Green
try {
    $buildCheck = if (-not (Test-Path (Join-Path $frontendPath ".next"))) { "npm run build; " } else { "" }
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; Write-Host '=== FRONTEND (porta 3001) ===' -ForegroundColor Cyan; $buildCheck; npm start"
    Start-Sleep -Seconds 2
    Write-Host "  Frontend iniciado!" -ForegroundColor Green
} catch {
    Write-Host "  ERRO ao iniciar frontend: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "[3/3] Iniciando Cloudflare Tunnel..." -ForegroundColor Green
try {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '=== CLOUDFLARE TUNNEL ===' -ForegroundColor Magenta; & '$cloudflaredPath' tunnel run talkfood-app"
    Start-Sleep -Seconds 2
    Write-Host "  Tunnel iniciado!" -ForegroundColor Green
} catch {
    Write-Host "  ERRO ao iniciar tunnel: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Todos os serviços foram iniciados!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "3 janelas do PowerShell foram abertas:" -ForegroundColor White
Write-Host "  - Backend: porta 3333" -ForegroundColor White
Write-Host "  - Frontend: porta 3001" -ForegroundColor White
Write-Host "  - Cloudflare Tunnel" -ForegroundColor White
Write-Host ""
Write-Host "Aguarde alguns segundos para tudo iniciar..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Acesse:" -ForegroundColor Cyan
Write-Host "  - Local: http://localhost:3001" -ForegroundColor White
Write-Host "  - Público: https://talkfoodsoftwerk.net" -ForegroundColor White
Write-Host ""
Read-Host "Pressione Enter para fechar esta janela"
