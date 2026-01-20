#!/bin/bash

# Script para criar arquivo .env.local (Linux/Mac)
# Execute: chmod +x criar-env.sh && ./criar-env.sh

echo "========================================"
echo "  Criar Arquivo .env.local            "
echo "========================================"
echo ""

ENV_FILE=".env.local"
EXAMPLE_FILE="env.local.example"
CLOUDFLARE_EXAMPLE="env.cloudflare.example"

# Verificar se .env.local já existe
if [ -f "$ENV_FILE" ]; then
    echo "⚠ Arquivo .env.local já existe!"
    read -p "Deseja sobrescrever? (s/N): " overwrite
    if [ "$overwrite" != "s" ] && [ "$overwrite" != "S" ]; then
        echo "Operação cancelada."
        exit 0
    fi
fi

echo "Selecione o tipo de ambiente:"
echo ""
echo "1. Local (desenvolvimento)"
echo "2. Cloudflare Tunnel (talkfoodsoftwerk.net)"
echo ""
read -p "Digite sua escolha (1 ou 2): " choice

if [ "$choice" = "1" ]; then
    if [ -f "$EXAMPLE_FILE" ]; then
        cp "$EXAMPLE_FILE" "$ENV_FILE"
        echo ""
        echo "✓ Arquivo .env.local criado com configuração LOCAL"
        echo "  Backend: http://localhost:8081"
        echo "  Frontend: http://localhost:3000"
    else
        echo "✗ Arquivo de exemplo não encontrado: $EXAMPLE_FILE"
        exit 1
    fi
elif [ "$choice" = "2" ]; then
    if [ -f "$CLOUDFLARE_EXAMPLE" ]; then
        cp "$CLOUDFLARE_EXAMPLE" "$ENV_FILE"
        echo ""
        echo "✓ Arquivo .env.local criado com configuração CLOUDFLARE TUNNEL"
        echo "  URL: https://talkfoodsoftwerk.net"
        echo "  Certifique-se de que o tunnel está rodando!"
    else
        echo "✗ Arquivo de exemplo não encontrado: $CLOUDFLARE_EXAMPLE"
        exit 1
    fi
else
    echo "✗ Opção inválida!"
    exit 1
fi

echo ""
echo "Arquivo criado: $ENV_FILE"
echo ""
echo "Próximos passos:"
echo "1. Revise o arquivo .env.local e ajuste se necessário"
echo "2. Execute: npm run dev"
echo ""
