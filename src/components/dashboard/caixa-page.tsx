"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api";
import { getApiAdapter } from "@/core/http/api-adapter";
import { formatPrice } from "@/lib/format";
import {
  Wallet,
  DollarSign,
  TrendingUp,
  Lock,
  Unlock,
  Calculator,
  Receipt,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CaixaPageProps {
  token: string;
}

interface CaixaStatus {
  isOpen: boolean;
  openedAt?: string;
  openedBy?: string;
  initialAmount: number;
  currentAmount: number;
  totalSales: number;
  totalOrders: number;
}

export function CaixaPage({ token }: CaixaPageProps) {
  const [loading, setLoading] = useState(true);
  const [caixaStatus, setCaixaStatus] = useState<CaixaStatus | null>(null);
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showChangeDialog, setShowChangeDialog] = useState(false);
  const [initialAmountRaw, setInitialAmountRaw] = useState(""); // Valor formatado (R$ 1.500,00)
  const [receivedAmountRaw, setReceivedAmountRaw] = useState(""); // Apenas dígitos
  const [changeAmount, setChangeAmount] = useState("");

  // Função para formatar valor monetário como no campo de preço do produto (R$ 1.500,00)
  function formatToBrl(value: string): string {
    // REMOVER TUDO QUE NÃO é numero
    const numbers = value.replace(/\D/g, "");

    if (!numbers) return "";

    // Converter para numero e dividir por 100 para ter os centavos
    const amount = parseInt(numbers) / 100;

    return amount.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  // Função para converter valor formatado (R$ 1.500,00) para centavos
  function convertBRLToCents(value: string): number {
    const cleanValue = value
      .replace(/[R$\s]/g, "")
      .replace(/\./g, "")
      .replace(",", ".");

    const reais = parseFloat(cleanValue) || 0;

    return Math.round(reais * 100);
  }

  // Função para formatar valor monetário para exibição (R$ 155,00) - mantida para outros campos
  const formatCurrencyDisplay = (digits: string): string => {
    if (!digits || digits === "") return "";
    
    const number = parseInt(digits, 10);
    if (isNaN(number)) return "";
    
    // Se for 0, retornar "0,00"
    if (number === 0) return "0,00";
    
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(number);
  };

  // Função para converter dígitos para número (em reais)
  const parseCurrency = (digits: string): number => {
    if (!digits) return 0;
    const number = parseInt(digits, 10);
    return isNaN(number) ? 0 : number;
  };

  // Handler para mudança do valor inicial (mesma lógica do campo de preço)
  function handleInitialAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatToBrl(e.target.value);
    setInitialAmountRaw(formatted);
  }

  useEffect(() => {
    loadCaixaStatus();
  }, [token]);

  const loadCaixaStatus = async () => {
    try {
      setLoading(true);
      const status = await apiClient<CaixaStatus>("/api/caixa/status", {
        method: "GET",
        token: token,
      });
      
      setCaixaStatus(status);
      setLoading(false);
    } catch (error) {
      console.error("Erro ao carregar status do caixa:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      
      // Se for 404, o endpoint não está implementado
      if (errorMessage.includes("404") || errorMessage.includes("Not Found")) {
        alert("Erro: O endpoint GET /api/caixa/status não está implementado no backend. Consulte o arquivo ENDPOINTS_BACKEND.md para implementação.");
      } else {
        alert(`Erro ao carregar status do caixa: ${errorMessage}`);
      }
      
      // Usar estado padrão em caso de erro
      setCaixaStatus({
        isOpen: false,
        initialAmount: 0,
        currentAmount: 0,
        totalSales: 0,
        totalOrders: 0,
      });
      setLoading(false);
    }
  };

  const handleOpenCaixa = async () => {
    try {
      // Converter valor formatado (R$ 1.500,00) para centavos
      const amountInCents = convertBRLToCents(initialAmountRaw);
      
      if (amountInCents <= 0) {
        alert("Por favor, informe um valor inicial válido.");
        return;
      }
      
      // Usar o adapter que já faz a serialização corretamente
      const api = getApiAdapter();
      await api.post("/api/caixa/open", { initialAmount: amountInCents }, { token });
      
      // Se chegou aqui, a requisição foi bem-sucedida
      await loadCaixaStatus();
      setShowOpenDialog(false);
      setInitialAmountRaw("");
      
      // Mostrar mensagem de sucesso
      alert("Caixa aberto com sucesso!");
    } catch (error) {
      // Tratar erros de forma mais específica
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      
      console.error("Erro ao abrir caixa:", error);
      
      // Verificar se é um erro relacionado ao backend não ter o endpoint implementado
      if (
        errorMessage.includes("404") || 
        errorMessage.includes("Not Found")
      ) {
        alert("Erro: O endpoint POST /api/caixa/open não está implementado no backend. Consulte o arquivo ENDPOINTS_BACKEND.md para implementação.");
      } else if (errorMessage.includes("400") || errorMessage.includes("Bad Request")) {
        alert(`Erro ao abrir caixa: ${errorMessage}. Verifique se o valor foi informado corretamente.`);
      } else {
        // Para outros erros, mostrar mensagem com detalhes
        alert(`Erro ao abrir caixa: ${errorMessage}`);
      }
    }
  };

  const handleCloseCaixa = async () => {
    try {
      await apiClient("/api/caixa/close", {
        method: "POST",
        token: token,
        silent404: true, // Silenciar erro 404 (endpoint pode não existir)
      });
      await loadCaixaStatus();
      setShowCloseDialog(false);
    } catch (error) {
      // Tratar todos os erros do caixa como endpoint não implementado ou erro do backend
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      
      // Verificar se é um erro relacionado ao backend não ter o endpoint implementado
      if (
        errorMessage.includes("404") || 
        errorMessage.includes("findFirst") || 
        errorMessage.includes("Cannot read properties") ||
        errorMessage.includes("não está implementado")
      ) {
        alert("Funcionalidade não disponível: O endpoint de fechamento de caixa não está implementado no backend. Por favor, implemente o endpoint POST /caixa/close no servidor.");
      } else {
        // Para outros erros, mostrar mensagem genérica
        alert("Erro ao fechar caixa. Verifique se o backend está configurado corretamente.");
      }
    }
  };

  const calculateChange = () => {
    // receivedAmountRaw está em centavos (apenas dígitos)
    const receivedInCents = parseCurrency(receivedAmountRaw);
    const totalInCents = caixaStatus?.currentAmount || 0;
    const changeInCents = receivedInCents - totalInCents;
    
    if (changeInCents >= 0) {
      // Converter centavos para reais e formatar
      const changeInReais = changeInCents / 100;
      setChangeAmount(changeInReais.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }));
    } else {
      setChangeAmount("0,00");
    }
  };

  useEffect(() => {
    if (receivedAmountRaw && caixaStatus) {
      calculateChange();
    }
  }, [receivedAmountRaw, caixaStatus]);

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <p className="text-center text-gray-600">Carregando status do caixa...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-normal text-black">Caixa</h1>
          <p className="text-sm sm:text-base mt-1">Gerencie abertura, fechamento e troco</p>
        </div>
        <div className="flex gap-2">
          {!caixaStatus?.isOpen ? (
            <Button
              onClick={() => {
                setInitialAmountRaw("");
                setShowOpenDialog(true);
              }}
              className="bg-brand-primary hover:bg-brand-primary/90 text-black tech-shadow tech-hover font-normal"
            >
              <Unlock className="w-5 h-5 mr-2 icon-3d" />
              Abrir Caixa
            </Button>
          ) : (
            <>
              <Button
                onClick={() => setShowChangeDialog(true)}
                variant="outline"
                className="border-app-border hover:bg-gray-100 tech-shadow tech-hover font-normal"
              >
                <Calculator className="w-5 h-5 mr-2 icon-3d" />
                Calcular Troco
              </Button>
              <Button
                onClick={() => setShowCloseDialog(true)}
                className="bg-red-500 hover:bg-red-600 text-white tech-shadow tech-hover font-normal"
              >
                <Lock className="w-5 h-5 mr-2 icon-3d" />
                Fechar Caixa
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status do Caixa */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          className={`bg-app-card border-app-border tech-shadow ${
            caixaStatus?.isOpen ? "border-green-500" : "border-red-500"
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-normal text-gray-600">Status</CardTitle>
            {caixaStatus?.isOpen ? (
              <Unlock className="w-4 h-4 text-green-500 icon-3d" />
            ) : (
              <Lock className="w-4 h-4 text-red-500 icon-3d" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-xl font-normal text-black">
              {caixaStatus?.isOpen ? "Aberto" : "Fechado"}
            </div>
            {caixaStatus?.openedAt && (
              <p className="text-xs text-gray-600 mt-1">
                Aberto em: {new Date(caixaStatus.openedAt).toLocaleString("pt-BR")}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-app-card border-app-border tech-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-normal text-gray-600">Valor Inicial</CardTitle>
            <Wallet className="w-4 h-4 text-brand-primary icon-3d" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-normal text-black">
              {formatPrice(caixaStatus?.initialAmount || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-app-card border-app-border tech-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-normal text-gray-600">Total no Caixa</CardTitle>
            <DollarSign className="w-4 h-4 text-brand-primary icon-3d" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-normal text-black">
              {formatPrice(caixaStatus?.currentAmount || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-app-card border-app-border tech-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-normal text-gray-600">Vendas do Dia</CardTitle>
            <TrendingUp className="w-4 h-4 text-brand-primary icon-3d" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-normal text-black">
              {formatPrice(caixaStatus?.totalSales || 0)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {caixaStatus?.totalOrders || 0} pedidos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dialog: Abrir Caixa */}
      <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
        <DialogContent className="bg-app-card border-app-border text-black">
          <DialogHeader>
            <DialogTitle className="text-2xl font-normal tracking-tight">
              Abrir Caixa
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Informe o valor inicial em dinheiro no caixa
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="initialAmount" className="mb-2">
                Valor Inicial (R$)
              </Label>
              <Input
                id="initialAmount"
                type="text"
                placeholder="Ex: 35,00"
                className="border-app-border bg-white text-black"
                value={initialAmountRaw}
                onChange={handleInitialAmountChange}
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowOpenDialog(false)}
                className="flex-1 border-app-border hover:bg-transparent tech-shadow tech-hover font-normal"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleOpenCaixa}
                className="flex-1 bg-brand-primary hover:bg-brand-primary/90 text-black tech-shadow tech-hover font-normal"
                disabled={!initialAmountRaw || convertBRLToCents(initialAmountRaw) <= 0}
              >
                Abrir Caixa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Fechar Caixa */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent className="bg-app-card border-app-border text-black">
          <DialogHeader>
            <DialogTitle className="text-2xl font-normal tracking-tight">
              Fechar Caixa
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Confirme o fechamento do caixa. O valor total será registrado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="bg-white rounded-lg p-4 border border-app-border">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Valor Inicial:</span>
                <span className="font-normal text-black">
                  {formatPrice(caixaStatus?.initialAmount || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Vendas do Dia:</span>
                <span className="font-normal text-black">
                  {formatPrice(caixaStatus?.totalSales || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-app-border">
                <span className="text-base font-normal">Total Esperado:</span>
                <span className="text-lg font-normal text-brand-primary">
                  {formatPrice(caixaStatus?.currentAmount || 0)}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCloseDialog(false)}
                className="flex-1 border-app-border hover:bg-transparent tech-shadow tech-hover font-normal"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCloseCaixa}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white tech-shadow tech-hover font-normal"
              >
                Fechar Caixa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Calcular Troco */}
      <Dialog open={showChangeDialog} onOpenChange={setShowChangeDialog}>
        <DialogContent className="bg-app-card border-app-border text-black">
          <DialogHeader>
            <DialogTitle className="text-2xl font-normal tracking-tight">
              Calcular Troco
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Informe o valor recebido para calcular o troco
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="total" className="mb-2">
                Total a Pagar
              </Label>
              <Input
                id="total"
                type="text"
                className="border-app-border bg-white text-black"
                value={formatPrice(caixaStatus?.currentAmount || 0)}
                disabled
              />
            </div>
            <div>
              <Label htmlFor="receivedAmount" className="mb-2">
                Valor Recebido (R$)
              </Label>
              <Input
                id="receivedAmount"
                type="text"
                placeholder="0,00"
                className="border-app-border bg-white text-black"
                value={formatCurrencyDisplay(receivedAmountRaw)}
                onChange={(e) => {
                  // Extrai apenas dígitos do valor digitado
                  const digits = e.target.value.replace(/\D/g, "");
                  setReceivedAmountRaw(digits);
                }}
              />
            </div>
            <div>
              <Label htmlFor="changeAmount" className="mb-2">
                Troco
              </Label>
              <Input
                id="changeAmount"
                type="text"
                className="border-app-border bg-white text-black font-normal text-lg"
                value={`R$ ${changeAmount}`}
                disabled
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setShowChangeDialog(false);
                setReceivedAmountRaw("");
                setChangeAmount("");
              }}
              className="w-full border-app-border hover:bg-transparent tech-shadow tech-hover font-normal"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
