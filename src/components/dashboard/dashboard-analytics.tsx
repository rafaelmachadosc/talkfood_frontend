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
  paymentMethods?: SalesMetrics["paymentMethods"];
}

export function DashboardAnalytics({ token }: DashboardAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<SalesMetrics | null>(null);
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 29);
    const year = start.getFullYear();
    const month = String(start.getMonth() + 1).padStart(2, "0");
    const day = String(start.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
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
    const maybeData = (data as { data?: unknown; items?: unknown })?.data ?? (data as { items?: unknown })?.items;
    if (Array.isArray(maybeData)) return maybeData;
    return [];
  };
  const normalizeDailyEntry = (data: unknown): DailySales | null => {
    if (!data || typeof data !== "object") return null;
    const raw = data as Record<string, unknown>;
    const dateValue = (raw.date || raw.day_date || raw.dayDate || raw.Date || raw.day) as string | undefined;
    if (!dateValue) return null;
    const totalValue = raw.totalSales ?? raw.total ?? raw.total_cents ?? raw.totalCents ?? raw.TotalSales ?? 0;
    const ordersValue = raw.totalOrders ?? raw.orders ?? raw.total_orders ?? raw.totalOrdersCount ?? raw.TotalOrders ?? 0;
    const paymentMethods =
      normalizePaymentMethods(
        raw.paymentMethods ||
          raw.payment_methods ||
          raw.paymentMethodTotals ||
          raw.payment_methods_totals
      );
    return {
      date: String(dateValue).slice(0, 10),
      total: typeof totalValue === "number" ? totalValue : Number(totalValue) || 0,
      orders: typeof ordersValue === "number" ? ordersValue : Number(ordersValue) || 0,
      paymentMethods,
    };
  };

  useEffect(() => {
    async function loadData() {
      try {
        const dailyData = await apiClient<DailySales | { data?: DailySales } | null>(
          `/api/analytics/daily?date=${endDate}`,
          {
            method: "GET",
            token: token,
            silent404: true,
          }
        );
        const rangeData = await apiClient<DailySales[] | { data?: DailySales[]; items?: DailySales[] } | null>(
          `/api/analytics/range?start=${startDate}&end=${endDate}`,
          {
            method: "GET",
            token: token,
            silent404: true,
          }
        );

        const dailyEntry = normalizeDailyEntry(
          (dailyData as { data?: unknown })?.data ?? dailyData
        );
        const rangeEntries = normalizeDailySales(rangeData)
          .map((entry) => normalizeDailyEntry(entry) || entry)
          .filter(Boolean) as DailySales[];

        if (!dailyEntry) {
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
          setMetrics({
            totalToday: dailyEntry.total,
            totalWeek: 0,
            totalMonth: 0,
            ordersToday: dailyEntry.orders,
            ordersWeek: 0,
            ordersMonth: 0,
            averageTicket: 0,
            growthRate: 0,
            paymentMethods: dailyEntry.paymentMethods || {
              DINHEIRO: 0,
              PIX: 0,
              CARTAO_CREDITO: 0,
              CARTAO_DEBITO: 0,
            },
          });
        }

        setDailySales(rangeEntries);
        setLoading(false);
      } catch (error) {
        console.error("Erro ao carregar métricas:", error);
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
  }, [token, startDate, endDate]);

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
  const uniqueDates = Array.from(new Set(sortedDailySales.map((entry) => entry.date))).sort();
  const sumLastDays = (days: number) => {
    const targetDates = uniqueDates.slice(-days);
    const totalsByDate = new Map<string, number>();
    sortedDailySales.forEach((entry) => {
      totalsByDate.set(entry.date, entry.total);
    });
    return targetDates.reduce((sum, date) => sum + (totalsByDate.get(date) || 0), 0);
  };
  const availableDays = uniqueDates.length;
  const total7Days = availableDays > 0 ? sumLastDays(Math.min(7, availableDays)) : 0;
  const total15Days = availableDays >= 15 ? sumLastDays(15) : 0;
  const total30Days = availableDays >= 30 ? sumLastDays(30) : 0;
  const paymentMethods = metrics.paymentMethods || {
    DINHEIRO: 0,
    PIX: 0,
    CARTAO_CREDITO: 0,
    CARTAO_DEBITO: 0,
  };
  const periodTotal = sortedDailySales.reduce((sum, entry) => sum + entry.total, 0);
  const periodPaymentMethods = sortedDailySales.reduce(
    (acc, entry) => {
      const methods = entry.paymentMethods;
      if (!methods) return acc;
      acc.DINHEIRO += methods.DINHEIRO || 0;
      acc.PIX += methods.PIX || 0;
      acc.CARTAO_CREDITO += methods.CARTAO_CREDITO || 0;
      acc.CARTAO_DEBITO += methods.CARTAO_DEBITO || 0;
      return acc;
    },
    { DINHEIRO: 0, PIX: 0, CARTAO_CREDITO: 0, CARTAO_DEBITO: 0 }
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#9FC131]/40 to-transparent" />
        <span className="text-xs tracking-[0.3em] uppercase text-[#9FC131]">Dashboard</span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#9FC131]/40 to-transparent" />
      </div>

      <div className="flex items-center justify-between text-xs text-black">
        <span className="uppercase tracking-wide text-gray-600">Calendário</span>
        <div className="flex items-center gap-2">
          <label htmlFor="dashboard-start-date" className="text-[11px] text-gray-500">
            De
          </label>
          <input
            type="date"
            id="dashboard-start-date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="border border-app-border rounded-md px-2 py-1 text-xs text-black bg-white"
          />
          <label htmlFor="dashboard-end-date" className="text-[11px] text-gray-500">
            Até
          </label>
          <input
            type="date"
            id="dashboard-end-date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="border border-app-border rounded-md px-2 py-1 text-xs text-black bg-white"
          />
        </div>
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
            <span className="text-[#FFA500]">{formatPrice(periodPaymentMethods.PIX || 0)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-black">
            <div className="flex items-center gap-2">
              <Wallet className="w-3.5 h-3.5 text-[#9FC131]" />
              <span>Dinheiro</span>
            </div>
            <span className="text-[#FFA500]">{formatPrice(periodPaymentMethods.DINHEIRO || 0)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-black">
            <div className="flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5 text-[#9FC131]" />
              <span>Crédito</span>
            </div>
            <span className="text-[#FFA500]">{formatPrice(periodPaymentMethods.CARTAO_CREDITO || 0)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-black">
            <div className="flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5 text-[#9FC131]" />
              <span>Débito</span>
            </div>
            <span className="text-[#FFA500]">{formatPrice(periodPaymentMethods.CARTAO_DEBITO || 0)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-black pt-2 border-t border-app-border">
            <span>Total:</span>
            <span className="text-[#FFA500]">
              {formatPrice(
                (periodPaymentMethods.PIX || 0) +
                  (periodPaymentMethods.DINHEIRO || 0) +
                  (periodPaymentMethods.CARTAO_CREDITO || 0) +
                  (periodPaymentMethods.CARTAO_DEBITO || 0)
              )}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
