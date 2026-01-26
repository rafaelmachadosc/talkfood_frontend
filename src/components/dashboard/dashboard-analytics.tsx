"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { DollarSign, CalendarDays, CalendarRange, CalendarClock, CreditCard, Wallet, QrCode } from "lucide-react";

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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#9FC131]/40 to-transparent" />
        <span className="text-sm tracking-[0.4em] uppercase text-[#9FC131]">Dashboard</span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#9FC131]/40 to-transparent" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-[#0F1216] border border-[#1E2530] shadow-[0_0_20px_rgba(159,193,49,0.15)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-normal tracking-wider text-[#9FC131]">Vendas Hoje</CardTitle>
            <DollarSign className="w-4 h-4 text-[#9FC131]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-normal text-white">{formatPrice(metrics.totalToday)}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#0F1216] border border-[#1E2530] shadow-[0_0_20px_rgba(159,193,49,0.15)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-normal tracking-wider text-[#9FC131]">Vendas 7 Dias</CardTitle>
            <CalendarDays className="w-4 h-4 text-[#9FC131]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-normal text-white">{formatPrice(total7Days)}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#0F1216] border border-[#1E2530] shadow-[0_0_20px_rgba(159,193,49,0.15)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-normal tracking-wider text-[#9FC131]">Vendas 15 Dias</CardTitle>
            <CalendarRange className="w-4 h-4 text-[#9FC131]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-normal text-white">{formatPrice(total15Days)}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#0F1216] border border-[#1E2530] shadow-[0_0_20px_rgba(159,193,49,0.15)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-normal tracking-wider text-[#9FC131]">Vendas 30 Dias</CardTitle>
            <CalendarClock className="w-4 h-4 text-[#9FC131]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-normal text-white">{formatPrice(total30Days)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-[#0F1216] border border-[#1E2530] shadow-[0_0_20px_rgba(159,193,49,0.15)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-normal tracking-wider text-[#9FC131]">Vendas em Dinheiro</CardTitle>
            <Wallet className="w-4 h-4 text-[#9FC131]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-normal text-white">
              {formatPrice(metrics.paymentMethods?.DINHEIRO || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0F1216] border border-[#1E2530] shadow-[0_0_20px_rgba(159,193,49,0.15)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-normal tracking-wider text-[#9FC131]">Vendas em Pix</CardTitle>
            <QrCode className="w-4 h-4 text-[#9FC131]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-normal text-white">
              {formatPrice(metrics.paymentMethods?.PIX || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0F1216] border border-[#1E2530] shadow-[0_0_20px_rgba(159,193,49,0.15)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-normal tracking-wider text-[#9FC131]">Vendas em Cartão C.</CardTitle>
            <CreditCard className="w-4 h-4 text-[#9FC131]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-normal text-white">
              {formatPrice(metrics.paymentMethods?.CARTAO_CREDITO || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0F1216] border border-[#1E2530] shadow-[0_0_20px_rgba(159,193,49,0.15)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-normal tracking-wider text-[#9FC131]">Vendas em Cartão D.</CardTitle>
            <CreditCard className="w-4 h-4 text-[#9FC131]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-normal text-white">
              {formatPrice(metrics.paymentMethods?.CARTAO_DEBITO || 0)}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
