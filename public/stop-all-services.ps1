# Script para encerrar todos os serviços (Frontend, Backend, Cloudflare)
# Execute: .\stop-all-services.ps1

Write-Host "Encerrando processos nas portas 3000, 3001 e 3333..." -ForegroundColor Yellow

# Função para encerrar processos em uma porta específica
function Stop-ProcessOnPort {
    param($Port)
    
    $connections = netstat -ano | findstr ":$Port" | findstr LISTENING
    if ($connections) {
        foreach ($conn in $connections) {
            $pid = ($conn -split '\s+')[-1]
            if ($pid) {
                try {
                    $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                    if ($process) {
                        Write-Host "  Encerrando processo na porta $Port (PID: $pid - $($process.ProcessName))" -ForegroundColor Yellow
                        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                        Start-Sleep -Milliseconds 500
                    }
                } catch {
                    Write-Host "  Nao foi possivel encerrar processo na porta $Port (PID: $pid). Tente como administrador." -ForegroundColor Red
                }
            }
        }
    } else {
        Write-Host "  Nenhum processo encontrado na porta $Port" -ForegroundColor Gray
    }
}

# Encerrar processos nas portas
Stop-ProcessOnPort -Port 3000
Stop-ProcessOnPort -Port 3001
Stop-ProcessOnPort -Port 3333

# Encerrar processos cloudflared
Write-Host ""
Write-Host "Encerrando processos cloudflared..." -ForegroundColor Yellow
Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Limpeza concluida!" -ForegroundColor Green
