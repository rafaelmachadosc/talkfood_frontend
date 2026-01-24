"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCcw } from "lucide-react";
import { Order } from "@/lib/types";
import { apiClient } from "@/lib/api";
import { Card, CardTitle, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/format";
import { EyeIcon, ChefHat, ShoppingCart } from "lucide-react";
import { OrderModal } from "@/components/dashboard/ordere-modal";
import { OrderForm } from "@/components/dashboard/order-form";
import { markOrderAsViewedAction } from "@/actions/orders";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { orderEvents, orderEventHelpers } from "@/lib/order-events";

interface OrdersProps {
  token: string;
}

interface GroupedOrders {
  key: string; // "MESA_5" ou "BALCAO"
  table?: number;
  comanda?: string;
  name?: string;
  phone?: string;
  orders: Order[];
  hasNewOrders: boolean;
  hasInProduction: boolean; // true se algum pedido está em produção (draft: false, status: false)
  hasOpen: boolean; // true se todos os pedidos estão abertos (draft: true) e não são novos
  total: number;
}

export function Orders({ token }: OrdersProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<null | string>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const safeFetchOrders = async (endpoint: string) => {
    try {
      const response = await apiClient<Order[]>(endpoint, {
        method: "GET",
        cache: "no-store",
        token: token,
        silent404: true,
      });
      return Array.isArray(response) ? response : [];
    } catch {
      return [];
    }
  };

  const fetchOrders = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const draftOrders = await safeFetchOrders("/api/orders?draft=true");
      const nonDraftOrders = await safeFetchOrders("/api/orders?draft=false");
      const fallbackOrders = draftOrders.length === 0 && nonDraftOrders.length === 0
        ? await safeFetchOrders("/api/orders")
        : [];
      
      // Combinar todas as respostas e remover duplicatas
      // Priorizar pedidos com itens quando há duplicatas
      // Isso garante que pedidos enviados para produção mantenham os itens e o total correto
      const orderMap = new Map<string, Order>();
      
      // Adicionar todos os pedidos, priorizando versões com itens
      [...draftOrders, ...nonDraftOrders, ...fallbackOrders].forEach((order) => {
        const existing = orderMap.get(order.id);
        
        // Se não existe ou se a nova versão tem itens e a existente não, atualizar
        if (!existing || (order.items && order.items.length > 0 && (!existing.items || existing.items.length === 0))) {
          orderMap.set(order.id, order);
        }
      });
      
      const uniqueOrders = Array.from(orderMap.values());

      // Mostrar mesas abertas (pedidos que ainda não foram finalizados)
      // Isso inclui rascunhos (mesas abertas) e pedidos em produção
      const pendingOrders = uniqueOrders.filter((order) => !order.status);

      // Ordenar: pedidos novos primeiro (viewed = false), depois por data
      // Tratar caso onde viewed pode não existir ainda (migration não executada)
      const sortedOrders = pendingOrders.sort((a, b) => {
        // Primeiro: pedidos não visualizados primeiro
        const aViewed = (a as any).viewed ?? false;
        const bViewed = (b as any).viewed ?? false;
        if (aViewed !== bViewed) {
          return aViewed ? 1 : -1;
        }
        // Depois: mais recentes primeiro
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
      // Criar chave única: mesa agrupa por número, balcão agrupa por ID (cada pedido é único)
      let key: string;
      if (order.orderType === "MESA" && order.table) {
        const comanda = order.comanda ? String(order.comanda).trim() : "";
        key = comanda ? `MESA_${order.table}_COMANDA_${comanda}` : `MESA_${order.table}`;
      } else {
        // Para BALCÃO, cada pedido é único - usar ID do pedido como chave
        // Isso permite ter múltiplos pedidos de balcão separados
        key = `BALCAO_${order.id}`;
      }

      if (!grouped[key]) {
        grouped[key] = {
          key,
          table: order.table,
          comanda: order.comanda ? String(order.comanda).trim() : undefined,
          name: order.name, // Nome do cliente para pedidos de balcão
          phone: order.phone, // Telefone do cliente
          orders: [],
          hasNewOrders: false,
          hasInProduction: false,
          hasOpen: false,
          total: 0,
        };
      }

      // Adicionar pedido ao grupo
      grouped[key].orders.push(order);
      
      // Atualizar flags do grupo
      const isNew = !(order.viewed ?? false);
      if (isNew) {
        grouped[key].hasNewOrders = true;
      }
      // Pedido em produção: draft = false e status = false
      const isInProduction = !order.draft && !order.status;
      if (isInProduction) {
        grouped[key].hasInProduction = true;
      }
      grouped[key].total += calculateOrderTotal(order);
    });

    // Converter para array e determinar hasOpen (pelo menos um pedido aberto e nenhum em produção)
    const groupedArray = Object.values(grouped);
    groupedArray.forEach((group) => {
      // hasOpen: tem pelo menos um pedido aberto (draft: true) e nenhum pedido em produção
      // Um grupo está "Aberto" se: tem pelo menos um pedido draft=true e nenhum pedido em produção
      // Não depende de hasNewOrders porque um pedido recém criado (fechado e recriado) pode ser novo mas ainda está aberto
      const hasOpenOrder = group.orders.some((order) => order.draft);
      group.hasOpen = hasOpenOrder && !group.hasInProduction;
    });
    
    groupedArray.sort((a, b) => {
      if (a.hasNewOrders && !b.hasNewOrders) return -1;
      if (!a.hasNewOrders && b.hasNewOrders) return 1;
      // Se ambos têm ou não têm pedidos novos, ordenar por mesa (se for mesa)
      if (a.table && b.table) {
        return a.table - b.table;
      }
      if (a.table) return -1;
      if (b.table) return 1;
      return 0;
    });

    return groupedArray;
  };

  const filteredGroups = groupOrdersByTable(orders).filter((group) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.trim().toLowerCase();
    const tableText = group.table ? String(group.table) : "";
    const comandaText = group.comanda ? String(group.comanda) : "";
    const nameText = group.name ? group.name.toLowerCase() : "";
    return (
      tableText.includes(term) ||
      comandaText.toLowerCase().includes(term) ||
      nameText.includes(term)
    );
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl sm:text-3xl font-normal text-black">Pedidos</h1>
            <p className="text-sm sm:text-base mt-1">
              Gerencie os pedidos e mesas do estabelecimento
            </p>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Buscar mesa, comanda ou pedido..."
            className="border-app-border bg-white text-black w-72"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <OrderForm />
          <Button
            className="bg-brand-primary text-black hover:bg-brand-primary"
            onClick={() => fetchOrders(true)}
          >
            <RefreshCcw className="w-5 h-5 icon-3d" />
          </Button>
          <Button
            variant="outline"
            className="border-red-500 text-red-600 hover:bg-red-50"
            onClick={async () => {
              const confirmClear = confirm("Tem certeza que deseja LIMPAR TODOS os pedidos? Esta ação não pode ser desfeita!");
              if (!confirmClear) return;
              
              setLoading(true);
              try {
                // Buscar todos os pedidos
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
                
                // Deletar todos os pedidos que não estão finalizados
                const pendingOrders = uniqueOrders.filter((order) => !order.status);
                
                let deleted = 0;
                let errors = 0;
                
                for (const order of pendingOrders) {
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
                
                alert(`Limpeza concluída!\n${deleted} pedido(s) deletado(s).${errors > 0 ? `\n${errors} erro(s) ao deletar.` : ""}`);
                
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
            Limpar Todos
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
              <h2 className="text-xl font-normal text-black mb-1">Balcão</h2>
            </div>
            <div className="max-h-[calc(100vh-260px)] overflow-y-auto pr-2">
              {(() => {
                const balcaoGroups = filteredGroups.filter((g) => g.key.startsWith("BALCAO_"));
                
                return balcaoGroups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 bg-gray-50/50 rounded-lg border-2 border-dashed border-app-border">
                    <ShoppingCart className="w-12 h-12 text-gray-400 mb-3" />
                    <p className="text-center text-gray-600 font-normal">Nenhum pedido de balcão encontrado</p>
                    <p className="text-center text-gray-500 text-sm mt-1">Os pedidos do balcão aparecerão aqui</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {balcaoGroups.map((group) => {
            // Ordenar pedidos dentro do grupo: novos primeiro
            const sortedGroupOrders = [...group.orders].sort((a, b) => {
              const aNew = !(a.viewed ?? false);
              const bNew = !(b.viewed ?? false);
              if (aNew && !bNew) return -1;
              if (!aNew && bNew) return 1;
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });

                    return (
                    <Card
                      key={group.key}
                      className={cn(
                        "bg-app-card text-black tech-shadow tech-hover transition-all duration-300 cursor-pointer border-2 border-cyan-400 w-full",
                        group.hasNewOrders || group.hasInProduction || group.hasOpen ? "shadow-md" : ""
                      )}
                      onClick={() => setSelectedOrder(group.orders[0]?.id || null)}
                      style={{
                        order: group.hasNewOrders ? -1 : 0,
                      }}
                    >
                      <div className="p-3.5 h-[72px] grid grid-cols-3 items-center gap-3">
                        <div className="flex flex-col gap-0.5 text-left">
                          <CardTitle className="text-sm font-normal tracking-tight">
                            Balcão - {formatPrice(group.total)}
                          </CardTitle>
                        </div>
                        <div className="text-xs font-normal text-brand-primary text-center">
                          {group.hasNewOrders ? "Novo pedido" : ""}
                        </div>
                        <div className="flex flex-col items-end gap-0.5 text-xs text-black text-right">
                          {sortedGroupOrders.map((order) => {
                            const label = order.name || order.comanda || "";
                            if (!label) return null;
                            return (
                              <span key={order.id} className="leading-none">
                                {label}
                              </span>
                            );
                          })}
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

          {/* Coluna MESAS*/}
          <div className="pl-4 lg:pl-6">
            <div className="mb-6 pb-4 border-b border-app-border">
              <h2 className="text-xl font-normal text-black mb-1">Mesas</h2>
            </div>
            <div className="max-h-[calc(100vh-260px)] overflow-y-auto pr-2">
              {(() => {
                const mesaGroups = filteredGroups.filter((g) => g.key.startsWith("MESA_"));
                const occupiedTables = new Map<number, GroupedOrders[]>();
                mesaGroups.forEach((group) => {
                  if (group.table) {
                    const existing = occupiedTables.get(group.table) || [];
                    existing.push(group);
                    occupiedTables.set(group.table, existing);
                  }
                });

                const allTables = Array.from({ length: 20 }, (_, i) => i + 1);

                return (
                  <div className="flex flex-col gap-2.5">
                    {allTables.map((tableNumber) => {
                      const groups = occupiedTables.get(tableNumber) || [];

                      if (groups.length === 0) {
                      return (
                        <div
                          key={`MESA_${tableNumber}`}
                          className="relative transition-all duration-300"
                        >
                          <Card className="bg-gray-50 text-black tech-shadow tech-hover border-2 border-gray-200 w-full p-0">
                            <div className="p-3.5 h-[72px] grid grid-cols-3 items-center gap-3">
                              <CardTitle className="text-sm font-normal tracking-tight text-left">
                                Mesa {tableNumber.toString().padStart(2, "0")}
                              </CardTitle>
                              <div className="text-xs font-normal text-brand-primary text-center"></div>
                              <p className="text-xs text-gray-400 text-right">Livre</p>
                            </div>
                          </Card>
                        </div>
                      );
                      }

                      return groups.map((group) => {
                        const sortedGroupOrders = [...group.orders].sort((a, b) => {
                          const aNew = !(a.viewed ?? false);
                          const bNew = !(b.viewed ?? false);
                          if (aNew && !bNew) return -1;
                          if (!aNew && bNew) return 1;
                          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                        });

                      return (
                        <div
                          key={group.key}
                          className={cn(
                            "cursor-pointer transition-all duration-300",
                            group.hasNewOrders || group.hasInProduction || group.hasOpen ? "shadow-md" : ""
                          )}
                          onClick={() => {
                            const firstOrderId = group.orders[0]?.id;
                            if (firstOrderId) {
                              setSelectedOrder(firstOrderId);
                            }
                          }}
                        >
                          <Card className="bg-green-50 text-black tech-shadow tech-hover w-full border-2 border-green-400 p-0">
                            <div className="p-3.5 h-[72px] grid grid-cols-3 items-center gap-3">
                              <div className="flex flex-col gap-0.5 text-left">
                                <CardTitle className="text-sm font-normal tracking-tight">
                                  {tableNumber.toString().padStart(2, "0")} - {formatPrice(group.total)}
                                </CardTitle>
                              </div>
                              <div className="text-xs font-normal text-brand-primary text-center">
                                {group.hasNewOrders ? "Novo pedido" : ""}
                              </div>
                              <div className="flex flex-col items-end gap-0.5 text-xs text-black text-right">
                                {sortedGroupOrders.map((order) => {
                                  const label = order.comanda || order.name || "";
                                  if (!label) return null;
                                  return (
                                    <span key={order.id} className="leading-none">
                                      {label}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          </Card>
                        </div>
                      );
                      });
                    })}
                  </div>
                );
              })()}
            </div>
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
      />
    </div>
  );
}
