"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api";
import { formatPrice } from "@/lib/format";

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
  const normalizeDailySales = (data: unknown): DailySales[] => {
    if (Array.isArray(data)) return data;
    const maybeData = (data as { data?: unknown })?.data;
    if (Array.isArray(maybeData)) return maybeData;
    return [];
  };

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
        const dailyData = await apiClient<DailySales[] | { data?: DailySales[] } | null>("/api/analytics/daily-sales", {
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

        setDailySales(normalizeDailySales(dailyData));
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

  const sortedDailySales = [...dailySales].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const sumLastDays = (days: number) => {
    const slice = sortedDailySales.slice(-days);
    return slice.reduce((sum, item) => sum + item.total, 0);
  };
  const total7Days = sortedDailySales.length >= 7 ? sumLastDays(7) : metrics.totalWeek;
  const total15Days = sortedDailySales.length >= 15 ? sumLastDays(15) : 0;
  const total30Days = sortedDailySales.length >= 30 ? sumLastDays(30) : metrics.totalMonth;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#9FC131]/40 to-transparent" />
        <span className="text-xs tracking-[0.3em] uppercase text-[#9FC131]">Dashboard</span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#9FC131]/40 to-transparent" />
      </div>

      <Card className="bg-white border border-app-border rounded-lg shadow-none">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between text-sm text-black">
            <span>Vendas de hoje</span>
            <span className="text-[#FFA500]">{formatPrice(metrics.totalToday)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-black">
            <span>Vendas dos últimos 7 dias</span>
            <span className="text-[#FFA500]">{formatPrice(total7Days)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-black">
            <span>Vendas dos últimos 15 dias</span>
            <span className="text-[#FFA500]">{formatPrice(total15Days)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-black">
            <span>Vendas dos últimos 30 dias</span>
            <span className="text-[#FFA500]">{formatPrice(total30Days)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-black pt-2 border-t border-app-border">
            <span>Total:</span>
            <span className="text-[#FFA500]">
              {formatPrice(metrics.totalToday + total7Days + total15Days + total30Days)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border border-app-border rounded-lg shadow-none">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between text-sm text-black">
            <span>Vendas em pix</span>
            <span className="text-[#FFA500]">{formatPrice(metrics.paymentMethods?.PIX || 0)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-black">
            <span>Vendas em dinheiro</span>
            <span className="text-[#FFA500]">{formatPrice(metrics.paymentMethods?.DINHEIRO || 0)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-black">
            <span>Vendas cartão de crédito</span>
            <span className="text-[#FFA500]">{formatPrice(metrics.paymentMethods?.CARTAO_CREDITO || 0)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-black">
            <span>Vendas em cartão de débito</span>
            <span className="text-[#FFA500]">{formatPrice(metrics.paymentMethods?.CARTAO_DEBITO || 0)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-black pt-2 border-t border-app-border">
            <span>Total:</span>
            <span className="text-[#FFA500]">
              {formatPrice(
                (metrics.paymentMethods?.PIX || 0) +
                  (metrics.paymentMethods?.DINHEIRO || 0) +
                  (metrics.paymentMethods?.CARTAO_CREDITO || 0) +
                  (metrics.paymentMethods?.CARTAO_DEBITO || 0)
              )}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
