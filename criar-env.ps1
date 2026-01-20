# Script para criar arquivo .env.local
# Execute: .\criar-env.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Criar Arquivo .env.local            " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$envFile = ".env.local"
$exampleFile = "env.local.example"
$cloudflareExample = "env.cloudflare.example"

# Verificar se .env.local já existe
if (Test-Path $envFile) {
    Write-Host "⚠ Arquivo .env.local já existe!" -ForegroundColor Yellow
    $overwrite = Read-Host "Deseja sobrescrever? (s/N)"
    if ($overwrite -ne "s" -and $overwrite -ne "S") {
        Write-Host "Operação cancelada." -ForegroundColor Gray
        exit
    }
}

Write-Host "Selecione o tipo de ambiente:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Local (desenvolvimento)" -ForegroundColor White
Write-Host "2. Cloudflare Tunnel (talkfoodsoftwerk.net)" -ForegroundColor White
Write-Host ""
$choice = Read-Host "Digite sua escolha (1 ou 2)"

if ($choice -eq "1") {
    if (Test-Path $exampleFile) {
        Copy-Item $exampleFile $envFile -Force
        Write-Host ""
        Write-Host "✓ Arquivo .env.local criado com configuração LOCAL" -ForegroundColor Green
        Write-Host "  Backend: http://localhost:8081" -ForegroundColor Gray
        Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Gray
    } else {
        Write-Host "✗ Arquivo de exemplo não encontrado: $exampleFile" -ForegroundColor Red
        exit 1
    }
} elseif ($choice -eq "2") {
    if (Test-Path $cloudflareExample) {
        Copy-Item $cloudflareExample $envFile -Force
        Write-Host ""
        Write-Host "✓ Arquivo .env.local criado com configuração CLOUDFLARE TUNNEL" -ForegroundColor Green
        Write-Host "  URL: https://talkfoodsoftwerk.net" -ForegroundColor Gray
        Write-Host "  Certifique-se de que o tunnel está rodando!" -ForegroundColor Yellow
    } else {
        Write-Host "✗ Arquivo de exemplo não encontrado: $cloudflareExample" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✗ Opção inválida!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Arquivo criado: $envFile" -ForegroundColor Cyan
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Yellow
Write-Host "1. Revise o arquivo .env.local e ajuste se necessário" -ForegroundColor White
Write-Host "2. Execute: npm run dev" -ForegroundColor White
Write-Host ""
