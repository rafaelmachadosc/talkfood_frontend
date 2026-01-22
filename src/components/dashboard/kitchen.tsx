"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { Order } from "@/lib/types";
import { apiClient } from "@/lib/api";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/format";
import { ShoppingCart } from "lucide-react";
import { OrderModal } from "@/components/dashboard/ordere-modal";
import { markOrderAsViewedAction } from "@/actions/orders";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { orderEvents } from "@/lib/order-events";

interface KitchenProps {
  token: string;
}

interface GroupedOrders {
  key: string; // "MESA_5" ou "BALCAO"
  table?: number;
  name?: string;
  phone?: string;
  orders: Order[];
  hasNewOrders: boolean;
  total: number;
}

export function Kitchen({ token }: KitchenProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<null | string>(null);

  const fetchOrders = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      // Buscar TODOS os pedidos para garantir sincronização
      // Primeiro busca rascunhos
      // Usar silent404 para não quebrar se endpoints não existirem ainda
      const draftResponse = await apiClient<Order[]>("/api/orders?draft=true", {
        method: "GET",
        cache: "no-store",
        token: token,
        silent404: true, // Silenciar 404 se endpoint não existir
      });

      // Depois busca não-rascunhos
      const nonDraftResponse = await apiClient<Order[]>("/api/orders?draft=false", {
        method: "GET",
        cache: "no-store",
        token: token,
        silent404: true, // Silenciar 404 se endpoint não existir
      });

      // Se ambos retornaram null (404), tratar como array vazio
      const draftOrders = (draftResponse && Array.isArray(draftResponse)) ? draftResponse : [];
      const nonDraftOrders = (nonDraftResponse && Array.isArray(nonDraftResponse)) ? nonDraftResponse : [];
      
      // Combinar todas as respostas e remover duplicatas
      const allOrders = [...draftOrders, ...nonDraftOrders];
      const uniqueOrders = Array.from(
        new Map(allOrders.map((order) => [order.id, order])).values()
      );

      // Filtrar APENAS pedidos em produção (draft: false E status: false)
      // Não incluir rascunhos (draft: true) na tela Cozinha
      const inProductionOrders = uniqueOrders.filter(
        (order) => !order.draft && !order.status
      );

      // Ordenar: pedidos novos primeiro (viewed = false), depois por data
      const sortedOrders = inProductionOrders.sort((a, b) => {
        const aViewed = (a as any).viewed ?? false;
        const bViewed = (b as any).viewed ?? false;
        if (aViewed !== bViewed) {
          return aViewed ? 1 : -1;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setOrders(sortedOrders);
      if (showLoading) {
        setLoading(false);
      }
    } catch (err) {
      console.error("Erro ao buscar pedidos:", err);
      setOrders([]);
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Carregamento inicial: carregar pedidos quando a página é aberta
  useEffect(() => {
    fetchOrders(true); // Mostrar loading apenas no carregamento inicial
  }, [token]);

  // Carregamento reativo: escuta eventos de mudanças (novo pedido, mesa aberta, etc)
  // Atualização silenciosa (sem mostrar loading)
  useEffect(() => {
    const unsubscribe = orderEvents.on("refresh:orders", () => {
      fetchOrders(false); // Atualização silenciosa
    });

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]); // token é estável, fetchOrders é definido dentro do componente

  const calculateOrderTotal = (order: Order) => {
    if (!order.items) return 0;

    return order.items.reduce((total, item) => {
      return total + item.product.price * item.amount;
    }, 0);
  };

  const handleMarkAsViewed = async (orderId: string) => {
    const result = await markOrderAsViewedAction(orderId);
    if (result.success) {
      // Notificar componentes sobre pedido visualizado (atualização silenciosa)
      orderEventHelpers.notifyOrderViewed();
      // Atualizar silenciosamente (sem mostrar loading)
      await fetchOrders(false);
    }
  };

  // Agrupar pedidos por mesa (ou balcão)
  const groupOrdersByTable = (orders: Order[]): GroupedOrders[] => {
    const grouped: Record<string, GroupedOrders> = {};

    orders.forEach((order) => {
      let key: string;
      if (order.orderType === "MESA" && order.table) {
        key = `MESA_${order.table}`;
      } else {
        key = "BALCAO";
      }

      if (!grouped[key]) {
        grouped[key] = {
          key,
          table: order.table,
          name: order.name,
          phone: order.phone,
          orders: [],
          hasNewOrders: false,
          total: 0,
        };
      }

      grouped[key].orders.push(order);
      const isNew = !(order.viewed ?? false);
      if (isNew) {
        grouped[key].hasNewOrders = true;
      }
      grouped[key].total += calculateOrderTotal(order);
    });

    const groupedArray = Object.values(grouped);
    groupedArray.sort((a, b) => {
      if (a.hasNewOrders && !b.hasNewOrders) return -1;
      if (!a.hasNewOrders && b.hasNewOrders) return 1;
      if (a.table && b.table) {
        return a.table - b.table;
      }
      if (a.table) return -1;
      if (b.table) return 1;
      return 0;
    });

    return groupedArray;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-normal text-black">Cozinha</h1>
          <p className="text-sm sm:text-base mt-1">
            Gerencie os pedidos em produção
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            className="bg-brand-primary text-black hover:bg-brand-primary"
            onClick={fetchOrders}
          >
            <RefreshCcw className="w-5 h-5 icon-3d" />
          </Button>
          <Button
            variant="outline"
            className="border-red-500 text-red-600 hover:bg-red-50"
            onClick={async () => {
              const confirmClear = confirm("Tem certeza que deseja LIMPAR TODOS os pedidos da cozinha? Esta ação não pode ser desfeita!");
              if (!confirmClear) return;
              
              setLoading(true);
              try {
                // Buscar todos os pedidos em produção
                const draftResponse = await apiClient<Order[]>("/api/orders?draft=true", {
                  method: "GET",
                  cache: "no-store",
                  token: token,
                  silent404: true, // Silenciar 404 se endpoint não existir
                });
                const nonDraftResponse = await apiClient<Order[]>("/api/orders?draft=false", {
                  method: "GET",
                  cache: "no-store",
                  token: token,
                  silent404: true, // Silenciar 404 se endpoint não existir
                });
                
                const allOrders = [...(draftResponse || []), ...(nonDraftResponse || [])];
                const uniqueOrders = Array.from(new Map(allOrders.map((order) => [order.id, order])).values());
                
                // Deletar apenas pedidos em produção (draft: false e status: false)
                const inProductionOrders = uniqueOrders.filter((order) => !order.draft && !order.status);
                
                let deleted = 0;
                let errors = 0;
                
                for (const order of inProductionOrders) {
                  try {
                    await apiClient(`/api/order?order_id=${order.id}`, {
                      method: "DELETE",
                      token: token,
                    });
                    deleted++;
                  } catch (err) {
                    console.error(`Erro ao deletar pedido ${order.id}:`, err);
                    errors++;
                  }
                }
                
                alert(`Limpeza concluída!\n${deleted} pedido(s) deletado(s) da cozinha.${errors > 0 ? `\n${errors} erro(s) ao deletar.` : ""}`);
                
                // Notificar componentes sobre pedidos deletados (atualização silenciosa)
                if (deleted > 0) {
                  orderEventHelpers.notifyOrderDeleted();
                }
                
                // Atualizar silenciosamente (sem mostrar loading)
                await fetchOrders(false);
              } catch (err) {
                console.error("Erro ao limpar pedidos:", err);
                alert("Erro ao limpar pedidos. Verifique o console para mais detalhes.");
              } finally {
                setLoading(false);
              }
            }}
          >
            Limpar Cozinha
          </Button>
        </div>
      </div>

      {loading ? (
        <div>
          <p className="text-center text-gray-600">Carregando pedidos...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          {/* Coluna PEDIDOS (Balcão) */}
          <div className="pr-4 lg:pr-6 border-r-0 lg:border-r border-app-border">
            <div className="mb-6 pb-4 border-b border-app-border">
              <h2 className="text-xl font-normal text-black mb-1">Pedidos</h2>
              <p className="text-sm text-gray-600">Pedidos do balcão em produção</p>
            </div>
            {(() => {
              const balcaoOrders = orders.filter((o) => o.orderType === "BALCAO");
              const balcaoGroups = groupOrdersByTable(balcaoOrders);

              return balcaoGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 bg-gray-50/50 rounded-lg border-2 border-dashed border-app-border">
                  <ShoppingCart className="w-12 h-12 text-gray-400 mb-3" />
                  <p className="text-center text-gray-600 font-normal">
                    Nenhum pedido de balcão em produção
                  </p>
                  <p className="text-center text-gray-500 text-sm mt-1">
                    Os pedidos do balcão em produção aparecerão aqui
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                  {balcaoGroups.map((group) => {
                    const sortedGroupOrders = [...group.orders].sort((a, b) => {
                      const aNew = !(a.viewed ?? false);
                      const bNew = !(b.viewed ?? false);
                      if (aNew && !bNew) return -1;
                      if (!aNew && bNew) return 1;
                      return (
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                      );
                    });

                    return (
                      <Card
                        key={group.key}
                        className={cn(
                          "bg-app-card text-black tech-shadow tech-hover transition-all duration-300 cursor-pointer aspect-square",
                          group.hasNewOrders
                            ? "border-2 border-red-500 shadow-md shadow-red-500/20"
                            : "border-2 border-yellow-500 shadow-md shadow-yellow-500/20"
                        )}
                        onClick={() => setSelectedOrder(group.orders[0]?.id || null)}
                        style={{
                          order: group.hasNewOrders ? -1 : 0,
                        }}
                      >
                        <div className="p-2.5 h-full flex flex-col">
                          <div className="flex items-start justify-between gap-1 mb-auto">
                            <CardTitle className="text-xs font-normal tracking-tight">
                              Balcão
                            </CardTitle>
                            <div className="flex flex-col items-end gap-0.5">
                              {group.hasNewOrders && (
                                <Badge
                                  variant="destructive"
                                  className="text-[9px] px-1 py-0 select-none animate-pulse h-3.5"
                                >
                                  Novo
                                </Badge>
                              )}
                              <Badge
                                variant="secondary"
                                className="text-[9px] px-1 py-0 select-none h-3.5"
                              >
                                {group.orders.length}
                              </Badge>
                            </div>
                          </div>

                          <div className="mt-auto space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-gray-500">Total</span>
                              <span className="text-xs font-normal text-brand-primary">
                                {formatPrice(group.total)}
                              </span>
                            </div>
                            {sortedGroupOrders.length > 0 &&
                              sortedGroupOrders[0].items &&
                              sortedGroupOrders[0].items.length > 0 && (
                                <p className="text-[9px] text-gray-600 truncate">
                                  {sortedGroupOrders[0].items.length} itens
                                </p>
                              )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Coluna MESAS (QR Code) */}
          <div className="pl-4 lg:pl-6">
            <div className="mb-6 pb-4 border-b border-app-border">
              <h2 className="text-xl font-normal text-black mb-1">Mesas</h2>
              <p className="text-sm text-gray-600">Pedidos das mesas em produção</p>
            </div>
            {(() => {
              const mesaOrders = orders.filter((o) => o.orderType === "MESA");
              const mesaGroups = groupOrdersByTable(mesaOrders);

              return mesaGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 bg-gray-50/50 rounded-lg border-2 border-dashed border-app-border">
                  <ShoppingCart className="w-12 h-12 text-gray-400 mb-3" />
                  <p className="text-center text-gray-600 font-normal">
                    Nenhuma mesa em produção
                  </p>
                  <p className="text-center text-gray-500 text-sm mt-1">
                    As mesas em produção aparecerão aqui
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                  {mesaGroups.map((group) => {
                    const sortedGroupOrders = [...group.orders].sort((a, b) => {
                      const aNew = !(a.viewed ?? false);
                      const bNew = !(b.viewed ?? false);
                      if (aNew && !bNew) return -1;
                      if (!aNew && bNew) return 1;
                      return (
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                      );
                    });

                    return (
                      <Card
                        key={group.key}
                        className={cn(
                          "bg-app-card text-black tech-shadow tech-hover transition-all duration-300 cursor-pointer aspect-square",
                          group.hasNewOrders
                            ? "border-2 border-red-500 shadow-md shadow-red-500/20"
                            : "border-2 border-yellow-500 shadow-md shadow-yellow-500/20"
                        )}
                        onClick={() => setSelectedOrder(group.orders[0]?.id || null)}
                        style={{
                          order: group.hasNewOrders ? -1 : 0,
                        }}
                      >
                        <div className="p-2.5 h-full flex flex-col">
                          <div className="flex items-start justify-between gap-1 mb-auto">
                            <CardTitle className="text-xs font-normal tracking-tight">
                              Mesa {group.table}
                            </CardTitle>
                            <div className="flex flex-col items-end gap-0.5">
                              {group.hasNewOrders && (
                                <Badge
                                  variant="destructive"
                                  className="text-[9px] px-1 py-0 select-none animate-pulse h-3.5"
                                >
                                  Novo
                                </Badge>
                              )}
                              <Badge
                                variant="secondary"
                                className="text-[9px] px-1 py-0 select-none h-3.5"
                              >
                                {group.orders.length}
                              </Badge>
                            </div>
                          </div>

                          <div className="mt-auto space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-gray-500">Total</span>
                              <span className="text-xs font-normal text-brand-primary">
                                {formatPrice(group.total)}
                              </span>
                            </div>
                            {sortedGroupOrders.length > 0 &&
                              sortedGroupOrders[0].items &&
                              sortedGroupOrders[0].items.length > 0 && (
                                <p className="text-[9px] text-gray-600 truncate">
                                  {sortedGroupOrders[0].items.length} itens
                                </p>
                              )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      <OrderModal
        orderId={selectedOrder}
        onClose={async () => {
          setSelectedOrder(null);
          // Atualizar silenciosamente (sem mostrar loading) ao fechar o modal
          await fetchOrders(false);
        }}
        token={token}
        isKitchen={true}
      />
    </div>
  );
}
