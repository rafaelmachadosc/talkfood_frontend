# Script para testar conectividade com o backend
# Testa se https://talkfoodsoftwerk.net está acessível

Write-Host "`n=== TESTE DE CONECTIVIDADE DO BACKEND ===" -ForegroundColor Cyan
Write-Host "URL: https://talkfoodsoftwerk.net`n" -ForegroundColor White

$baseUrl = "https://talkfoodsoftwerk.net"
$endpoints = @(
    "/api/auth/session",
    "/api/category",
    "/api/products",
    "/api/orders"
)

# Teste 1: Conectividade básica
Write-Host "1. Testando conectividade básica..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $baseUrl -Method GET -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    Write-Host "   ✓ Backend está acessível (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Erro ao conectar: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   ⚠️  O backend pode não estar rodando ou o Cloudflare Tunnel não está ativo" -ForegroundColor Yellow
    exit 1
}

# Teste 2: Verificar se é um erro 404 (backend existe mas endpoint não)
Write-Host "`n2. Testando endpoints da API..." -ForegroundColor Yellow
$successCount = 0
$failCount = 0

foreach ($endpoint in $endpoints) {
    $fullUrl = "$baseUrl$endpoint"
    try {
        $response = Invoke-WebRequest -Uri $fullUrl -Method GET -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
        Write-Host "   ✓ $endpoint - Status: $($response.StatusCode)" -ForegroundColor Green
        $successCount++
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 401 -or $statusCode -eq 403) {
            Write-Host "   ✓ $endpoint - Status: $statusCode (Autenticação requerida - OK)" -ForegroundColor Green
            $successCount++
        } elseif ($statusCode -eq 404) {
            Write-Host "   ⚠ $endpoint - Status: 404 (Endpoint não encontrado)" -ForegroundColor Yellow
            $failCount++
        } elseif ($statusCode -eq 500) {
            Write-Host "   ✗ $endpoint - Status: 500 (Erro interno do servidor)" -ForegroundColor Red
            $failCount++
        } else {
            Write-Host "   ✗ $endpoint - Erro: $($_.Exception.Message)" -ForegroundColor Red
            $failCount++
        }
    }
}

# Teste 3: Verificar variáveis de ambiente
Write-Host "`n3. Verificando variáveis de ambiente..." -ForegroundColor Yellow
$envVars = @(
    "NEXT_PUBLIC_API_URL",
    "NEXT_PUBLIC_CLOUDFLARE_TUNNEL_URL",
    "NEXT_PUBLIC_ENVIRONMENT_TYPE"
)

foreach ($var in $envVars) {
    $value = [Environment]::GetEnvironmentVariable($var, "Process")
    if ($value) {
        Write-Host "   ✓ $var = $value" -ForegroundColor Green
    } else {
        Write-Host "   ⚠ $var não está configurada" -ForegroundColor Yellow
    }
}

# Resumo
Write-Host "`n=== RESUMO ===" -ForegroundColor Cyan
Write-Host "Endpoints testados: $($endpoints.Count)" -ForegroundColor White
Write-Host "Sucessos: $successCount" -ForegroundColor Green
Write-Host "Falhas: $failCount" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Green" })

if ($successCount -gt 0) {
    Write-Host "`n✓ Backend está acessível e respondendo!" -ForegroundColor Green
    Write-Host "  O frontend deve conseguir se conectar ao backend." -ForegroundColor White
} else {
    Write-Host "`n✗ Backend não está respondendo corretamente." -ForegroundColor Red
    Write-Host "  Verifique:" -ForegroundColor Yellow
    Write-Host "  1. Se o backend está rodando" -ForegroundColor White
    Write-Host "  2. Se o Cloudflare Tunnel está ativo" -ForegroundColor White
    Write-Host "  3. Se o domínio está configurado corretamente" -ForegroundColor White
}

Write-Host "`n"
