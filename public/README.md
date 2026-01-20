This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Configuração

Antes de iniciar, certifique-se de que o backend está rodando na porta **8081**. O frontend está configurado para se conectar ao backend nesta porta.

#### Criar arquivo .env.local

**Opção 1: Usando script (recomendado)**

Windows (PowerShell):
```powershell
.\criar-env.ps1
```

Linux/Mac:
```bash
chmod +x criar-env.sh
./criar-env.sh
```

**Opção 2: Manualmente**

Copie o arquivo de exemplo:
```bash
# Para ambiente local
cp env.local.example .env.local

# OU para Cloudflare Tunnel
cp env.cloudflare.example .env.local
```

A URL da API está configurada no arquivo `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8081
```

#### Para Cloudflare Tunnel (talkfoodsoftwerk.net)

Configure a variável de ambiente no arquivo `.env.local`:
```
NEXT_PUBLIC_ENVIRONMENT_TYPE=cloudflare
NEXT_PUBLIC_CLOUDFLARE_TUNNEL_URL=https://talkfoodsoftwerk.net
```

**Ou simplesmente:**
```
NEXT_PUBLIC_ENVIRONMENT_TYPE=cloudflare
```

O sistema detectará automaticamente e usará `https://talkfoodsoftwerk.net` como URL padrão do tunnel.

**Importante**: Certifique-se de que:
1. O Cloudflare Tunnel está rodando e configurado para `talkfoodsoftwerk.net`
2. O backend está rodando na porta 8081
3. O tunnel está apontando para `localhost:8081` (backend)

### Executando o projeto

Primeiro, instale as dependências (se ainda não instalou):

```bash
npm install
```

Depois, execute o servidor de desenvolvimento:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

**Importante:** Execute os comandos npm dentro da pasta `public/`.

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

**Nota**: O frontend roda na porta 3000 e o backend na porta 8081.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
