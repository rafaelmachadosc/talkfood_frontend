"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { apiClient } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { CalendarDays, CalendarClock, CalendarRange, Clock, Wallet, QrCode, CreditCard } from "lucide-react";

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
  const normalizePaymentMethods = (input: unknown): SalesMetrics["paymentMethods"] => {
    const base = {
      DINHEIRO: 0,
      PIX: 0,
      CARTAO_CREDITO: 0,
      CARTAO_DEBITO: 0,
    };
    if (!input || typeof input !== "object") return base;
    const entries = Object.entries(input as Record<string, unknown>);
    entries.forEach(([key, value]) => {
      const normalizedKey = key.toUpperCase().replace(/\s+/g, "_");
      const amount = typeof value === "number" ? value : Number(value);
      if (Number.isNaN(amount)) return;
      if (normalizedKey.includes("DINHEIRO") || normalizedKey === "CASH") {
        base.DINHEIRO += amount;
      } else if (normalizedKey.includes("PIX")) {
        base.PIX += amount;
      } else if (normalizedKey.includes("CREDITO") || normalizedKey.includes("CREDIT")) {
        base.CARTAO_CREDITO += amount;
      } else if (normalizedKey.includes("DEBITO") || normalizedKey.includes("DEBIT")) {
        base.CARTAO_DEBITO += amount;
      }
    });
    return base;
  };
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
          const paymentMethods =
            normalizePaymentMethods(
              metricsData.paymentMethods ||
                (metricsData as { payment_methods?: unknown }).payment_methods ||
                (metricsData as { paymentMethodTotals?: unknown }).paymentMethodTotals ||
                (metricsData as { payment_methods_totals?: unknown }).payment_methods_totals
            );
          setMetrics({ ...metricsData, paymentMethods });
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

      <Card className="bg-white border border-app-border rounded-lg shadow-none overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-[#9FC131] via-[#9FC131]/60 to-transparent" />
        <CardContent className="p-4 space-y-2">
          <div className="text-xs text-black text-center tracking-wide uppercase">Vendas</div>
          <div className="flex items-center justify-between text-sm text-black">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-[#9FC131]" />
              <span>Hoje</span>
            </div>
            <span className="text-[#FFA500]">{formatPrice(metrics.totalToday)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-black">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-3.5 h-3.5 text-[#9FC131]" />
              <span>7 dias</span>
            </div>
            <span className="text-[#FFA500]">{formatPrice(total7Days)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-black">
            <div className="flex items-center gap-2">
              <CalendarRange className="w-3.5 h-3.5 text-[#9FC131]" />
              <span>15 dias</span>
            </div>
            <span className="text-[#FFA500]">{formatPrice(total15Days)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-black">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-3.5 h-3.5 text-[#9FC131]" />
              <span>30 dias</span>
            </div>
            <span className="text-[#FFA500]">{formatPrice(total30Days)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-black pt-2 border-t border-app-border">
            <span>Total:</span>
            <span className="text-[#FFA500]">{formatPrice(total30Days)}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border border-app-border rounded-lg shadow-none overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-[#FFA500] via-[#FFA500]/60 to-transparent" />
        <CardContent className="p-4 space-y-2">
          <div className="text-xs text-black text-center tracking-wide uppercase">Vendas</div>
          <div className="flex items-center justify-between text-sm text-black">
            <div className="flex items-center gap-2">
              <QrCode className="w-3.5 h-3.5 text-[#9FC131]" />
              <span>Pix</span>
            </div>
            <span className="text-[#FFA500]">{formatPrice(metrics.paymentMethods?.PIX || 0)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-black">
            <div className="flex items-center gap-2">
              <Wallet className="w-3.5 h-3.5 text-[#9FC131]" />
              <span>Dinheiro</span>
            </div>
            <span className="text-[#FFA500]">{formatPrice(metrics.paymentMethods?.DINHEIRO || 0)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-black">
            <div className="flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5 text-[#9FC131]" />
              <span>Crédito</span>
            </div>
            <span className="text-[#FFA500]">{formatPrice(metrics.paymentMethods?.CARTAO_CREDITO || 0)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-black">
            <div className="flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5 text-[#9FC131]" />
              <span>Débito</span>
            </div>
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
