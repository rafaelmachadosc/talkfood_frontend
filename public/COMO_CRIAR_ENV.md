# 📝 Como Criar o Arquivo .env.local

## ⚠️ IMPORTANTE: Você está na pasta correta?

Os arquivos estão na pasta **Frontend**, não Backend!

### ✅ Passos Corretos:

1. **Navegue para a pasta Frontend/public:**
   ```powershell
   cd "C:\Users\Rafael Machado\Downloads\Frontend\public"
   ```

2. **Execute o script:**
   ```powershell
   .\criar-env.ps1
   ```

   **OU copie manualmente:**
   ```powershell
   # Para ambiente local
   Copy-Item env.local.example .env.local
   
   # OU para Cloudflare Tunnel
   Copy-Item env.cloudflare.example .env.local
   ```

## 🚀 Comando Completo (copie e cole):

```powershell
cd "C:\Users\Rafael Machado\Downloads\Frontend\public"; .\criar-env.ps1
```

## 📋 Verificar se está na pasta correta:

```powershell
# Deve mostrar os arquivos env*.example
Get-ChildItem env*.example
```

Se não mostrar nada, você está na pasta errada!
