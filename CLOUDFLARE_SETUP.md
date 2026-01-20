# 🚀 Configuração do Cloudflare Tunnel - talkfoodsoftwerk.net

## 📋 Pré-requisitos

1. **Cloudflared instalado** - [Instalar Cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/)
2. **Conta Cloudflare** com o domínio `talkfoodsoftwerk.net` configurado
3. **Backend rodando** na porta 8081

## 🔧 Configuração Passo a Passo

### 1. Login no Cloudflare

```powershell
cloudflared tunnel login
```

Isso abrirá o navegador para autenticação. Selecione o domínio `talkfoodsoftwerk.net`.

### 2. Criar o Tunnel

```powershell
cloudflared tunnel create talkfood-app
```

Anote o **UUID** retornado (será algo como `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).

### 3. Configurar o Tunnel

Edite ou crie o arquivo de configuração em `%USERPROFILE%\.cloudflared\config.yml`:

```yaml
tunnel: <UUID_DO_TUNNEL>
credentials-file: %USERPROFILE%\.cloudflared\<UUID_DO_TUNNEL>.json

ingress:
  # Backend API (porta 8081)
  - hostname: api.talkfoodsoftwerk.net
    service: http://localhost:8081
  
  # Frontend Next.js (porta 3000) - opcional se quiser servir frontend também
  - hostname: talkfoodsoftwerk.net
    service: http://localhost:3000
  
  # Catch-all (deve ser o último)
  - service: http_status:404
```

### 4. Configurar Rotas DNS

```powershell
# Para o backend API
cloudflared tunnel route dns talkfood-app api.talkfoodsoftwerk.net

# Para o frontend (se configurado)
cloudflared tunnel route dns talkfood-app talkfoodsoftwerk.net
```

### 5. Configurar Variáveis de Ambiente

Crie o arquivo `.env.local` na pasta `public/`:

```env
NEXT_PUBLIC_ENVIRONMENT_TYPE=cloudflare
NEXT_PUBLIC_CLOUDFLARE_TUNNEL_URL=https://api.talkfoodsoftwerk.net
```

**Nota**: Se você configurou o backend em `api.talkfoodsoftwerk.net`, use essa URL. Se configurou tudo em `talkfoodsoftwerk.net`, use `https://talkfoodsoftwerk.net`.

### 6. Iniciar o Tunnel

```powershell
cloudflared tunnel run talkfood-app
```

Ou para rodar em background:

```powershell
cloudflared tunnel run talkfood-app --no-autoupdate
```

### 7. Verificar Configuração

Execute o script de verificação:

```powershell
.\check-cloudflare-setup.ps1
```

## 🎯 Configuração Recomendada

### Opção 1: Backend Separado (Recomendado)

- **Backend**: `api.talkfoodsoftwerk.net` → `localhost:8081`
- **Frontend**: `talkfoodsoftwerk.net` → `localhost:3000`

**config.yml:**
```yaml
tunnel: <UUID>
credentials-file: %USERPROFILE%\.cloudflared\<UUID>.json

ingress:
  - hostname: api.talkfoodsoftwerk.net
    service: http://localhost:8081
  - hostname: talkfoodsoftwerk.net
    service: http://localhost:3000
  - service: http_status:404
```

**.env.local:**
```env
NEXT_PUBLIC_ENVIRONMENT_TYPE=cloudflare
NEXT_PUBLIC_CLOUDFLARE_TUNNEL_URL=https://api.talkfoodsoftwerk.net
```

### Opção 2: Tudo no Mesmo Domínio

- **Backend e Frontend**: `talkfoodsoftwerk.net`

**config.yml:**
```yaml
tunnel: <UUID>
credentials-file: %USERPROFILE%\.cloudflared\<UUID>.json

ingress:
  - hostname: talkfoodsoftwerk.net
    service: http://localhost:8081
  - service: http_status:404
```

**.env.local:**
```env
NEXT_PUBLIC_ENVIRONMENT_TYPE=cloudflare
NEXT_PUBLIC_CLOUDFLARE_TUNNEL_URL=https://talkfoodsoftwerk.net
```

## ✅ Verificação

1. **Backend rodando**: `http://localhost:8081` deve responder
2. **Tunnel rodando**: `cloudflared tunnel run talkfood-app` sem erros
3. **DNS configurado**: `nslookup api.talkfoodsoftwerk.net` deve resolver
4. **Frontend configurado**: `.env.local` com as variáveis corretas

## 🔍 Troubleshooting

### Tunnel não conecta
- Verifique se o backend está rodando na porta 8081
- Verifique as credenciais do tunnel
- Execute `cloudflared tunnel info talkfood-app`

### DNS não resolve
- Aguarde alguns minutos para propagação
- Verifique no Cloudflare Dashboard se a rota está configurada
- Execute `cloudflared tunnel route dns list`

### Erro 502 Bad Gateway
- Verifique se o serviço local está rodando
- Verifique a porta no config.yml
- Verifique os logs do tunnel: `cloudflared tunnel run talkfood-app --loglevel debug`

## 📚 Recursos

- [Documentação Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Guia de Configuração](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/configuration/)
- Script de verificação: `.\check-cloudflare-setup.ps1`
