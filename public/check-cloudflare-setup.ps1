# Script para verificar e coletar informações do Cloudflare Tunnel
# Execute: .\check-cloudflare-setup.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Cloudflare Tunnel - Verificação      " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se cloudflared está instalado
Write-Host "1. Verificando se cloudflared esta instalado..." -ForegroundColor Yellow
$cloudflaredCmd = Get-Command cloudflared -ErrorAction SilentlyContinue
if ($cloudflaredCmd) {
    try {
        $cloudflaredVersion = & cloudflared --version 2>&1
        Write-Host "   ✓ cloudflared encontrado" -ForegroundColor Green
        Write-Host "   Versao: $cloudflaredVersion" -ForegroundColor Gray
    } catch {
        Write-Host "   ✗ cloudflared encontrado mas nao executa corretamente!" -ForegroundColor Red
        Write-Host "   Pode ser um problema de arquitetura (32-bit vs 64-bit)" -ForegroundColor Yellow
        Write-Host "   Consulte: INSTALAR_CLOUDFLARED.md" -ForegroundColor Cyan
    }
} else {
    Write-Host "   ✗ cloudflared NAO encontrado!" -ForegroundColor Red
    Write-Host "   Por favor, instale o cloudflared primeiro." -ForegroundColor Yellow
    Write-Host "   Consulte: INSTALAR_CLOUDFLARED.md" -ForegroundColor Cyan
}
Write-Host ""

# Verificar túneis existentes
Write-Host "2. Listando tuneis existentes..." -ForegroundColor Yellow
if ($cloudflaredCmd) {
    try {
        $tunnelOutput = & cloudflared tunnel list 2>&1
        $tunnelString = $tunnelOutput -join "`n"
        if ($tunnelString -match "talkfood") {
            Write-Host "   ✓ Tunel 'talkfood-app' encontrado!" -ForegroundColor Green
            $tunnelOutput | Write-Host
        } else {
            Write-Host "   ⚠ Tunel 'talkfood-app' NAO encontrado." -ForegroundColor Yellow
            Write-Host "   Execute: cloudflared tunnel create talkfood-app" -ForegroundColor Cyan
        }
    } catch {
        Write-Host "   ⚠ Erro ao listar tuneis. Voce esta logado?" -ForegroundColor Yellow
        Write-Host "   Execute: cloudflared tunnel login" -ForegroundColor Cyan
    }
} else {
    Write-Host "   ⚠ cloudflared nao esta disponivel para verificar tuneis." -ForegroundColor Yellow
}
Write-Host ""

# Verificar arquivo de configuração
Write-Host "3. Verificando arquivo de configuracao..." -ForegroundColor Yellow
$configPath = "$env:USERPROFILE\.cloudflared\config.yml"
if (Test-Path $configPath) {
    Write-Host "   ✓ Arquivo config.yml encontrado em:" -ForegroundColor Green
    Write-Host "     $configPath" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   Conteudo atual:" -ForegroundColor Yellow
    Get-Content $configPath | Write-Host -ForegroundColor Gray
} else {
    Write-Host "   ✗ Arquivo config.yml NAO encontrado." -ForegroundColor Red
    Write-Host "     Sera criado apos voce fornecer o UUID do tunel." -ForegroundColor Yellow
}
Write-Host ""

# Verificar arquivos de credenciais
Write-Host "4. Verificando arquivos de credenciais..." -ForegroundColor Yellow
$credentialsPath = "$env:USERPROFILE\.cloudflared"
if (Test-Path $credentialsPath) {
    $jsonFiles = Get-ChildItem "$credentialsPath\*.json" -ErrorAction SilentlyContinue
    if ($jsonFiles) {
        Write-Host "   ✓ Arquivos de credenciais encontrados:" -ForegroundColor Green
        foreach ($file in $jsonFiles) {
            $uuid = $file.BaseName
            Write-Host "     - $uuid" -ForegroundColor Gray
            Write-Host "       Arquivo: $($file.FullName)" -ForegroundColor DarkGray
        }
    } else {
        Write-Host "   ⚠ Nenhum arquivo de credenciais encontrado." -ForegroundColor Yellow
        Write-Host "     Sera criado apos criar o tunel." -ForegroundColor Gray
    }
} else {
    Write-Host "   ⚠ Pasta .cloudflared nao existe ainda." -ForegroundColor Yellow
    Write-Host "     Sera criada automaticamente ao executar comandos do cloudflared." -ForegroundColor Gray
}
Write-Host ""

# Verificar rotas DNS configuradas
Write-Host "5. Verificando rotas DNS configuradas..." -ForegroundColor Yellow
if ($cloudflaredCmd) {
    try {
        $routesOutput = & cloudflared tunnel route dns list 2>&1
        $routesString = $routesOutput -join "`n"
        if ($routesString -match "talkfoodsoftwerk") {
            Write-Host "   ✓ Rotas DNS encontradas:" -ForegroundColor Green
            $routesOutput | Select-String "talkfoodsoftwerk" | Write-Host -ForegroundColor Gray
        } else {
            Write-Host "   ⚠ Nenhuma rota DNS para talkfoodsoftwerk.net encontrada." -ForegroundColor Yellow
            Write-Host "     Execute: cloudflared tunnel route dns talkfood-app talkfoodsoftwerk.net" -ForegroundColor Cyan
        }
    } catch {
        Write-Host "   ⚠ Nao foi possivel verificar rotas DNS." -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠ cloudflared nao esta disponivel para verificar rotas DNS." -ForegroundColor Yellow
}
Write-Host ""

# Resumo de informações necessárias
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  INFORMACOES NECESSARIAS PARA CONFIG   " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para configurar o tunel, voce precisa:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. UUID do Tunel:" -ForegroundColor White
Write-Host "   - Execute: cloudflared tunnel create talkfood-app" -ForegroundColor Cyan
Write-Host "   - Copie o UUID exibido apos 'id: '" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Caminho do arquivo JSON de credenciais:" -ForegroundColor White
Write-Host "   - Geralmente: %USERPROFILE%\.cloudflared\<UUID>.json" -ForegroundColor Cyan
Write-Host "   - Este arquivo sera criado automaticamente" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Verificar configuracoes no Cloudflare Dashboard:" -ForegroundColor White
Write-Host "   - Acesse: https://dash.cloudflare.com" -ForegroundColor Cyan
Write-Host "   - Verifique se talkfoodsoftwerk.net esta configurado" -ForegroundColor Gray
Write-Host "   - Verifique SSL/TLS -> Modo: 'Full' ou 'Full (strict)'" -ForegroundColor Gray
Write-Host ""

Write-Host "Pressione qualquer tecla para continuar..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
