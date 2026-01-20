# Refatoração do Sistema - Cloudflare Tunnel

## 📋 Resumo das Mudanças

Esta refatoração implementa padrões de Clean Code, Strategy Pattern, Factory Pattern e DRY para suportar diferentes ambientes de conexão, incluindo Cloudflare Tunnel.

## 🏗️ Arquitetura

### 1. Strategy Pattern para Ambientes
- **Localização**: `src/core/config/environment-strategy.ts`
- **Estratégias**:
  - `LocalEnvironmentStrategy`: Ambiente local (porta 8081)
  - `CloudflareTunnelStrategy`: Cloudflare Tunnel (HTTPS)
  - `ProductionEnvironmentStrategy`: Ambiente de produção

### 2. Factory Pattern para HTTP Clients
- **Localização**: `src/core/http/http-client-factory.ts`
- **Clientes**:
  - `AuthenticatedHttpClient`: Requisições autenticadas
  - `PublicHttpClient`: Requisições públicas (sem autenticação)

### 3. Adapter Pattern para Compatibilidade
- **Localização**: `src/core/http/api-adapter.ts`
- Mantém compatibilidade com código legado enquanto usa o novo sistema

### 4. Helpers para Requisições Públicas
- **Localização**: `src/core/http/public-api-helper.ts`
- Funções auxiliares para simplificar requisições públicas

## 🔧 Configuração

### Variáveis de Ambiente

Crie um arquivo `.env.local` na pasta `public/`:

```env
# Ambiente local (padrão)
NEXT_PUBLIC_ENVIRONMENT_TYPE=local
NEXT_PUBLIC_API_URL=http://localhost:8081

# Para Cloudflare Tunnel
NEXT_PUBLIC_ENVIRONMENT_TYPE=cloudflare
NEXT_PUBLIC_CLOUDFLARE_TUNNEL_URL=https://your-app.trycloudflare.com
```

### Portas

- **Frontend**: 3000 (padrão Next.js)
- **Backend**: 8081 (configurado pelo usuário)

## 📦 Mudanças nos Arquivos

### Core (Novo)
- `src/core/config/environment-strategy.ts` - Estratégias de ambiente
- `src/core/http/http-client-factory.ts` - Factory de clientes HTTP
- `src/core/http/api-adapter.ts` - Adapter para compatibilidade
- `src/core/http/public-api-helper.ts` - Helpers para APIs públicas

### Refatorados
- `src/lib/api.ts` - Agora usa o novo sistema internamente
- `src/actions/products.ts` - Usa `getApiAdapter()`
- `src/actions/orders.ts` - Usa `getApiAdapter()`
- `src/actions/menu.ts` - Usa `HttpClientFactory.getPublicClient()`
- `src/app/menu/page.tsx` - Usa `fetchPublicAll()`
- `src/app/comanda/page.tsx` - Usa helpers públicos

### Configuração
- `package.json` - Porta atualizada para 3000 (frontend)
- `server.js` - Porta atualizada para 3000 (frontend)
- Backend configurado para porta 8081
- `.env.example` - Exemplo de configuração

## 🚀 Como Usar

### Desenvolvimento Local

```bash
cd public
npm run dev
# Frontend rodará em http://localhost:3000
# Backend deve estar rodando em http://localhost:8081
```

### Com Cloudflare Tunnel

1. Configure a variável de ambiente:
```env
NEXT_PUBLIC_ENVIRONMENT_TYPE=cloudflare
NEXT_PUBLIC_CLOUDFLARE_TUNNEL_URL=https://talkfoodsoftwerk.net
```

**Ou simplesmente:**
```env
NEXT_PUBLIC_ENVIRONMENT_TYPE=cloudflare
```

O sistema usará `https://talkfoodsoftwerk.net` como padrão se a URL não for especificada.

2. O sistema detectará automaticamente e usará HTTPS

**Veja o guia completo**: `CLOUDFLARE_SETUP.md`

### Produção

```bash
npm run build
npm start
# ou
node server.js
```

## 🔄 Migração de Código Legado

### Antes (Código Antigo)
```typescript
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/endpoint`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(data),
});
```

### Depois (Novo Sistema)
```typescript
import { getApiAdapter } from "@/core/http/api-adapter";

const api = getApiAdapter();
await api.post("/endpoint", data, { token });
```

### Para Requisições Públicas
```typescript
import { fetchPublic, postPublic } from "@/core/http/public-api-helper";

const data = await fetchPublic<MyType>("/public/endpoint");
await postPublic("/public/endpoint", { data });
```

## ✨ Benefícios

1. **DRY**: Eliminação de código duplicado
2. **Strategy Pattern**: Fácil troca entre ambientes
3. **Factory Pattern**: Criação centralizada de clientes HTTP
4. **Adapter Pattern**: Compatibilidade com código legado
5. **Clean Code**: Separação de responsabilidades
6. **Type Safety**: Melhor tipagem TypeScript
7. **Manutenibilidade**: Código mais fácil de manter e testar

## 🔍 Padrões Aplicados

- ✅ Strategy Pattern
- ✅ Factory Pattern
- ✅ Adapter Pattern
- ✅ Singleton Pattern (EnvironmentConfigManager)
- ✅ DRY (Don't Repeat Yourself)
- ✅ Separation of Concerns
- ✅ Dependency Injection (implícito)

## 📝 Notas

- O código legado continua funcionando através do adapter
- A migração pode ser feita gradualmente
- Todas as requisições agora passam pelo novo sistema
- Suporte automático para Cloudflare Tunnel quando configurado
