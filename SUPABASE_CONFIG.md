# 🚀 Configuração do Frontend no Supabase

## 📋 Resumo

O frontend está sendo buildado no Supabase e precisa se conectar ao backend através do Cloudflare Tunnel em `https://talkfoodsoftwerk.net`.

## ⚙️ Configuração no Supabase

### 1. Acessar Environment Variables

1. Acesse o projeto no Supabase Dashboard
2. Vá em **Settings** → **Environment Variables**
3. Ou acesse diretamente: `https://supabase.com/dashboard/project/[SEU_PROJETO]/settings/environment-variables`

### 2. Adicionar Variável de Ambiente

Adicione a seguinte variável:

**Name:**
```
NEXT_PUBLIC_API_URL
```

**Value:**
```
https://talkfoodsoftwerk.net
```

**Environment:**
- ✅ **Production** (obrigatório)
- ✅ **Development** (opcional, mas recomendado)

**Save** (Salvar)

### 3. Variáveis Opcionais (Recomendadas)

Para melhor controle, você também pode adicionar:

**Name:** `NEXT_PUBLIC_ENVIRONMENT_TYPE`  
**Value:** `cloudflare`  
**Environment:** Production, Development

**Name:** `NEXT_PUBLIC_CLOUDFLARE_TUNNEL_URL`  
**Value:** `https://talkfoodsoftwerk.net`  
**Environment:** Production, Development

## 🔄 Após Configurar

### 1. Aguardar Build

- O Supabase detectará a mudança automaticamente
- Um novo build será iniciado
- Aguarde a conclusão (status: "Building" → "Ready")

### 2. Verificar Deploy

- Após o build, o deploy será automático
- Você receberá uma URL do frontend (ex: `https://seu-projeto.supabase.app`)

### 3. Testar Conexão

1. Acesse a URL do frontend
2. Tente fazer login
3. Verifique se consegue se conectar ao backend

## 🔍 Como o Frontend Usa a Variável

O frontend está configurado para usar `NEXT_PUBLIC_API_URL` através do sistema de configuração:

1. **Sistema de Environment Strategy** (`src/core/config/environment-strategy.ts`)
   - Detecta automaticamente se `NEXT_PUBLIC_CLOUDFLARE_TUNNEL_URL` está configurado
   - Usa `https://talkfoodsoftwerk.net` como padrão se `NEXT_PUBLIC_ENVIRONMENT_TYPE=cloudflare`

2. **HTTP Client Factory** (`src/core/http/http-client-factory.ts`)
   - Cria clientes HTTP configurados com a URL correta
   - Suporta requisições autenticadas e públicas

3. **API Adapter** (`src/core/http/api-adapter.ts`)
   - Mantém compatibilidade com código legado
   - Usa a configuração de ambiente automaticamente

## ✅ Checklist

- [ ] Variável `NEXT_PUBLIC_API_URL` configurada no Supabase
- [ ] Valor: `https://talkfoodsoftwerk.net`
- [ ] Ambiente: Production (e Development)
- [ ] Build concluído no Supabase
- [ ] Frontend deployado
- [ ] Teste de conexão realizado

## 🐛 Troubleshooting

### Frontend não conecta ao backend

1. **Verificar variável de ambiente:**
   - Confirme que `NEXT_PUBLIC_API_URL` está configurada
   - Verifique se o valor está correto: `https://talkfoodsoftwerk.net`

2. **Verificar build:**
   - Variáveis de ambiente são injetadas no build
   - Se mudou a variável, precisa fazer novo build

3. **Verificar backend:**
   - Backend deve estar rodando na porta 8081
   - Cloudflare Tunnel deve estar ativo
   - Teste: `https://talkfoodsoftwerk.net/session` (deve retornar erro de método, não 404)

4. **Verificar CORS:**
   - Backend precisa permitir requisições do domínio do Supabase
   - Verifique configuração CORS no backend

### Erro 404 no backend

- Verifique se o Cloudflare Tunnel está rodando
- Verifique se o backend está rodando na porta 8081
- Teste o backend localmente: `http://localhost:8081/users`

### Erro de CORS

- Backend precisa ter CORS configurado para aceitar requisições do domínio do Supabase
- Adicione o domínio do Supabase na lista de origens permitidas

## 📝 Notas Importantes

1. **Variáveis NEXT_PUBLIC_*** são expostas ao cliente (browser)
   - Não coloque informações sensíveis aqui
   - Use apenas para configurações públicas

2. **Build necessário:**
   - Variáveis de ambiente são injetadas no momento do build
   - Qualquer mudança requer novo build

3. **Ambientes separados:**
   - Production e Development podem ter valores diferentes
   - Configure ambos se quiser testar em desenvolvimento

## 🔗 Links Úteis

- [Documentação Supabase Environment Variables](https://supabase.com/docs/guides/platform/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
