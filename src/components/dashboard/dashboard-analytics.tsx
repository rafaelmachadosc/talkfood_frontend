"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package, CreditCard, Wallet } from "lucide-react";

interface DashboardAnalyticsProps {
  token: string;
}

interface SalesMetrics {
  totalToday: number;
  totalWeek: number;
  totalMonth: number;
  ordersToday: number;
  ordersWeek: number;
  ordersMonth: number;
  averageTicket: number;
  growthRate: number;
  // Valores por método de pagamento (em centavos)
  paymentMethods?: {
    DINHEIRO: number;
    PIX: number;
    CARTAO_CREDITO: number;
    CARTAO_DEBITO: number;
  };
}

interface DailySales {
  date: string;
  total: number;
  orders: number;
}

export function DashboardAnalytics({ token }: DashboardAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<SalesMetrics | null>(null);
  const [dailySales, setDailySales] = useState<DailySales[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        // Buscar métricas de vendas (silent404 para não gerar erro no console se endpoint não existir)
        const metricsData = await apiClient<SalesMetrics | null>("/api/analytics/metrics", {
          method: "GET",
          token: token,
          silent404: true,
        });

        // Buscar vendas diárias (últimos 7 dias)
        const dailyData = await apiClient<DailySales[] | null>("/api/analytics/daily-sales", {
          method: "GET",
          token: token,
          silent404: true,
        });

        // Se os endpoints não existirem (404), usar valores padrão
        if (metricsData === null) {
          setMetrics({
            totalToday: 0,
            totalWeek: 0,
            totalMonth: 0,
            ordersToday: 0,
            ordersWeek: 0,
            ordersMonth: 0,
            averageTicket: 0,
            growthRate: 0,
            paymentMethods: {
              DINHEIRO: 0,
              PIX: 0,
              CARTAO_CREDITO: 0,
              CARTAO_DEBITO: 0,
            },
          });
        } else {
          setMetrics(metricsData);
        }

        setDailySales(dailyData || []);
        setLoading(false);
      } catch (error) {
        console.error("Erro ao carregar métricas:", error);
        // Fallback para valores padrão em caso de outro erro
        setMetrics({
          totalToday: 0,
          totalWeek: 0,
          totalMonth: 0,
          ordersToday: 0,
          ordersWeek: 0,
          ordersMonth: 0,
          averageTicket: 0,
          growthRate: 0,
          paymentMethods: {
            DINHEIRO: 0,
            PIX: 0,
            CARTAO_CREDITO: 0,
            CARTAO_DEBITO: 0,
          },
        });
        setDailySales([]);
        setLoading(false);
      }
    }

    loadData();
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <p className="text-center text-gray-600">Carregando métricas...</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <p className="text-center text-gray-600">Erro ao carregar métricas</p>
      </div>
    );
  }

  // Calcular altura máxima do gráfico
  const maxSales = Math.max(...dailySales.map((d) => d.total), 1);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-normal text-black">Dashboard</h1>
        <p className="text-sm sm:text-base mt-1">Métricas e gráficos de vendas</p>
      </div>

      {/* Cards de Métricas Gerais */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-app-card border-app-border tech-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-normal text-gray-600">Vendas Hoje</CardTitle>
            <DollarSign className="w-4 h-4 text-brand-primary icon-3d" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-normal text-black">{formatPrice(metrics.totalToday)}</div>
            <p className="text-xs text-gray-600 mt-1">{metrics.ordersToday} pedidos</p>
          </CardContent>
        </Card>

        <Card className="bg-app-card border-app-border tech-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-normal text-gray-600">Vendas Semana</CardTitle>
            <TrendingUp className="w-4 h-4 text-brand-primary icon-3d" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-normal text-black">{formatPrice(metrics.totalWeek)}</div>
            <p className="text-xs text-gray-600 mt-1">{metrics.ordersWeek} pedidos</p>
          </CardContent>
        </Card>

        <Card className="bg-app-card border-app-border tech-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-normal text-gray-600">Vendas Mês</CardTitle>
            <ShoppingCart className="w-4 h-4 text-brand-primary icon-3d" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-normal text-black">{formatPrice(metrics.totalMonth)}</div>
            <p className="text-xs text-gray-600 mt-1">{metrics.ordersMonth} pedidos</p>
          </CardContent>
        </Card>

        <Card className="bg-app-card border-app-border tech-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-normal text-gray-600">Ticket Médio</CardTitle>
            <Package className="w-4 h-4 text-brand-primary icon-3d" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-normal text-black">
              {formatPrice(metrics.averageTicket)}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {metrics.growthRate >= 0 ? (
                <TrendingUp className="w-3 h-3 text-green-500" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-500" />
              )}
              <p className="text-xs text-gray-600">
                {metrics.growthRate >= 0 ? "+" : ""}
                {metrics.growthRate.toFixed(1)}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards de Métodos de Pagamento */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-app-card border-app-border tech-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-normal text-gray-600">Dinheiro</CardTitle>
            <Wallet className="w-4 h-4 text-brand-primary icon-3d" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-normal text-black">
              {formatPrice(metrics.paymentMethods?.DINHEIRO || 0)}
            </div>
            <p className="text-xs text-gray-600 mt-1">Total recebido</p>
          </CardContent>
        </Card>

        <Card className="bg-app-card border-app-border tech-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-normal text-gray-600">PIX</CardTitle>
            <DollarSign className="w-4 h-4 text-brand-primary icon-3d" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-normal text-black">
              {formatPrice(metrics.paymentMethods?.PIX || 0)}
            </div>
            <p className="text-xs text-gray-600 mt-1">Total recebido</p>
          </CardContent>
        </Card>

        <Card className="bg-app-card border-app-border tech-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-normal text-gray-600">Cartão de Crédito</CardTitle>
            <CreditCard className="w-4 h-4 text-brand-primary icon-3d" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-normal text-black">
              {formatPrice(metrics.paymentMethods?.CARTAO_CREDITO || 0)}
            </div>
            <p className="text-xs text-gray-600 mt-1">Total recebido</p>
          </CardContent>
        </Card>

        <Card className="bg-app-card border-app-border tech-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-normal text-gray-600">Cartão de Débito</CardTitle>
            <CreditCard className="w-4 h-4 text-brand-primary icon-3d" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-normal text-black">
              {formatPrice(metrics.paymentMethods?.CARTAO_DEBITO || 0)}
            </div>
            <p className="text-xs text-gray-600 mt-1">Total recebido</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Vendas Diárias */}
      <Card className="bg-app-card border-app-border tech-shadow">
        <CardHeader>
          <CardTitle className="text-lg font-normal text-black">
            Vendas dos Últimos 7 Dias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-between gap-2">
            {dailySales.map((day, index) => {
              const height = (day.total / maxSales) * 100;
              const date = new Date(day.date);
              const dayName = date.toLocaleDateString("pt-BR", { weekday: "short" });

              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div className="relative w-full flex items-end justify-center" style={{ height: "200px" }}>
                    <div
                      className="w-full bg-brand-primary rounded-t transition-all hover:opacity-80 tech-shadow"
                      style={{ height: `${height}%`, minHeight: height > 0 ? "4px" : "0" }}
                      title={`${dayName}: ${formatPrice(day.total)}`}
                    />
                  </div>
                  <div className="text-xs text-gray-600 text-center">
                    <div className="font-normal">{formatPrice(day.total)}</div>
                    <div className="text-[10px] mt-1">{dayName}</div>
                    <div className="text-[10px] text-gray-500">{day.orders} ped.</div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
