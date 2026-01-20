# ⚡ Configuração Rápida - Cloudflare Tunnel

## 🎯 Configuração Mínima para talkfoodsoftwerk.net

### 1. Criar arquivo `.env.local` na pasta `public/`

```env
NEXT_PUBLIC_ENVIRONMENT_TYPE=cloudflare
NEXT_PUBLIC_CLOUDFLARE_TUNNEL_URL=https://talkfoodsoftwerk.net
```

### 2. Verificar se o backend está rodando

```bash
# Backend deve estar na porta 8081
# Teste: http://localhost:8081
```

### 3. Iniciar o Cloudflare Tunnel

```powershell
cloudflared tunnel run talkfood-app
```

### 4. Iniciar o frontend

```bash
cd public
npm run dev
```

## ✅ Pronto!

O sistema está configurado para:
- ✅ Usar `https://talkfoodsoftwerk.net` como URL da API
- ✅ Detectar automaticamente o ambiente Cloudflare
- ✅ Conectar ao backend através do tunnel

## 📝 Notas Importantes

- O domínio padrão é `talkfoodsoftwerk.net` - não precisa especificar a URL se usar esse domínio
- O backend deve estar rodando em `localhost:8081`
- O tunnel deve estar configurado para rotear `talkfoodsoftwerk.net` → `localhost:8081`

## 🔍 Verificação

Execute o script de verificação:
```powershell
.\check-cloudflare-setup.ps1
```

Para mais detalhes, veja: `CLOUDFLARE_SETUP.md`
