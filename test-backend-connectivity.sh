#!/bin/bash

# Script para testar conectividade com o backend
# Testa se https://talkfoodsoftwerk.net está acessível

echo ""
echo "=== TESTE DE CONECTIVIDADE DO BACKEND ==="
echo "URL: https://talkfoodsoftwerk.net"
echo ""

BASE_URL="https://talkfoodsoftwerk.net"
ENDPOINTS=(
    "/api/auth/session"
    "/api/category"
    "/api/products"
    "/api/orders"
)

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Teste 1: Conectividade básica
echo -e "${YELLOW}1. Testando conectividade básica...${NC}"
if curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$BASE_URL" | grep -q "200\|301\|302\|404"; then
    echo -e "   ${GREEN}✓ Backend está acessível${NC}"
else
    echo -e "   ${RED}✗ Erro ao conectar ao backend${NC}"
    echo -e "   ${YELLOW}⚠️  O backend pode não estar rodando ou o Cloudflare Tunnel não está ativo${NC}"
    exit 1
fi

# Teste 2: Verificar endpoints da API
echo -e "\n${YELLOW}2. Testando endpoints da API...${NC}"
SUCCESS_COUNT=0
FAIL_COUNT=0

for endpoint in "${ENDPOINTS[@]}"; do
    FULL_URL="$BASE_URL$endpoint"
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$FULL_URL")
    
    if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
        echo -e "   ${GREEN}✓ $endpoint - Status: $HTTP_CODE${NC}"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    elif [ "$HTTP_CODE" -eq 401 ] || [ "$HTTP_CODE" -eq 403 ]; then
        echo -e "   ${GREEN}✓ $endpoint - Status: $HTTP_CODE (Autenticação requerida - OK)${NC}"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    elif [ "$HTTP_CODE" -eq 404 ]; then
        echo -e "   ${YELLOW}⚠ $endpoint - Status: 404 (Endpoint não encontrado)${NC}"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    elif [ "$HTTP_CODE" -eq 500 ]; then
        echo -e "   ${RED}✗ $endpoint - Status: 500 (Erro interno do servidor)${NC}"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    else
        echo -e "   ${RED}✗ $endpoint - Status: $HTTP_CODE${NC}"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
done

# Teste 3: Verificar variáveis de ambiente
echo -e "\n${YELLOW}3. Verificando variáveis de ambiente...${NC}"
ENV_VARS=(
    "NEXT_PUBLIC_API_URL"
    "NEXT_PUBLIC_CLOUDFLARE_TUNNEL_URL"
    "NEXT_PUBLIC_ENVIRONMENT_TYPE"
)

for var in "${ENV_VARS[@]}"; do
    if [ -n "${!var}" ]; then
        echo -e "   ${GREEN}✓ $var = ${!var}${NC}"
    else
        echo -e "   ${YELLOW}⚠ $var não está configurada${NC}"
    fi
done

# Resumo
echo -e "\n${CYAN}=== RESUMO ===${NC}"
echo -e "${WHITE}Endpoints testados: ${#ENDPOINTS[@]}${NC}"
echo -e "${GREEN}Sucessos: $SUCCESS_COUNT${NC}"
if [ $FAIL_COUNT -gt 0 ]; then
    echo -e "${RED}Falhas: $FAIL_COUNT${NC}"
else
    echo -e "${GREEN}Falhas: $FAIL_COUNT${NC}"
fi

if [ $SUCCESS_COUNT -gt 0 ]; then
    echo -e "\n${GREEN}✓ Backend está acessível e respondendo!${NC}"
    echo -e "${WHITE}  O frontend deve conseguir se conectar ao backend.${NC}"
else
    echo -e "\n${RED}✗ Backend não está respondendo corretamente.${NC}"
    echo -e "${YELLOW}  Verifique:${NC}"
    echo -e "${WHITE}  1. Se o backend está rodando${NC}"
    echo -e "${WHITE}  2. Se o Cloudflare Tunnel está ativo${NC}"
    echo -e "${WHITE}  3. Se o domínio está configurado corretamente${NC}"
fi

echo ""
