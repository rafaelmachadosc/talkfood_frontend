# Teste rápido de conectividade
$url = "https://talkfoodsoftwerk.net/api/auth/session"

Write-Host ""
Write-Host "Testando: $url" -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    Write-Host "✓ Backend está acessível! Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    $statusCode = $null
    if ($null -ne $_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
    }
    
    if ($statusCode -eq 401) {
        Write-Host "✓ Backend está acessível! Status: 401 (Autenticação requerida)" -ForegroundColor Green
    } elseif ($statusCode -eq 403) {
        Write-Host "✓ Backend está acessível! Status: 403 (Autenticação requerida)" -ForegroundColor Green
    } elseif ($null -ne $statusCode) {
        Write-Host "✗ Erro: Status Code $statusCode" -ForegroundColor Red
    } else {
        Write-Host "✗ Erro ao conectar: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "  O backend pode não estar acessível ou o Cloudflare Tunnel não está ativo" -ForegroundColor Yellow
    }
}

Write-Host ""
