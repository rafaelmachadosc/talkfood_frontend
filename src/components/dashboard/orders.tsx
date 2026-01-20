"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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

interface OrdersProps {
  token: string;
}

interface GroupedOrders {
  key: string; // "MESA_5" ou "BALCAO"
  table?: number;
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
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<null | string>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      // Buscar todos os pedidos (incluindo rascunhos) para mostrar mesas abertas
      // Mesas criadas manualmente podem começar como rascunho
      const response = await apiClient<Order[]>("/api/orders?draft=true", {
        method: "GET",
        cache: "no-store",
        token: token,
      });

      if (!response || !Array.isArray(response)) {
        console.error("Resposta inválida:", response);
        setOrders([]);
        setLoading(false);
        return;
      }

      // Buscar também pedidos não-rascunhos para garantir sincronização completa
      const nonDraftResponse = await apiClient<Order[]>("/api/orders?draft=false", {
        method: "GET",
        cache: "no-store",
        token: token,
      });

      const draftOrders = response || [];
      const nonDraftOrders = nonDraftResponse || [];
      
      // Combinar todas as respostas e remover duplicatas
      const allOrders = [...draftOrders, ...nonDraftOrders];
      const uniqueOrders = Array.from(
        new Map(allOrders.map((order) => [order.id, order])).values()
      );

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
      setLoading(false);
    } catch (err) {
      console.error("Erro ao buscar pedidos:", err);
      setOrders([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    async function loadOrders() {
      await fetchOrders();
    }

    loadOrders();

    // Atualizar automaticamente a cada 5 segundos para manter sincronização com Cozinha
    const interval = setInterval(() => {
      fetchOrders();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const calculateOrderTotal = (order: Order) => {
    if (!order.items) return 0;

    return order.items.reduce((total, item) => {
      return total + item.product.price * item.amount;
    }, 0);
  };

  const handleMarkAsViewed = async (orderId: string) => {
    const result = await markOrderAsViewedAction(orderId);
    if (result.success) {
      await fetchOrders();
      router.refresh();
    }
  };

  // Agrupar pedidos por mesa (ou balcão)
  const groupOrdersByTable = (orders: Order[]): GroupedOrders[] => {
    const grouped: Record<string, GroupedOrders> = {};

    orders.forEach((order) => {
      // Criar chave única: apenas mesa (não telefone) ou "BALCAO"
      let key: string;
      if (order.orderType === "MESA" && order.table) {
        // Agrupar apenas por mesa - todos os pedidos da mesma mesa ficam juntos
        key = `MESA_${order.table}`;
      } else {
        key = "BALCAO";
      }

      if (!grouped[key]) {
        grouped[key] = {
          key,
          table: order.table,
          name: order.name, // Pegar o nome do primeiro pedido
          phone: order.phone, // Pegar o telefone do primeiro pedido
          orders: [],
          hasNewOrders: false,
          hasInProduction: false,
          hasOpen: false,
          total: 0,
        };
      }

      grouped[key].orders.push(order);
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
          <OrderForm />
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
              const confirmClear = confirm("Tem certeza que deseja LIMPAR TODOS os pedidos? Esta ação não pode ser desfeita!");
              if (!confirmClear) return;
              
              setLoading(true);
              try {
                // Buscar todos os pedidos
                const draftResponse = await apiClient<Order[]>("/api/orders?draft=true", {
                  method: "GET",
                  cache: "no-store",
                  token: token,
                });
                const nonDraftResponse = await apiClient<Order[]>("/api/orders?draft=false", {
                  method: "GET",
                  cache: "no-store",
                  token: token,
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
                
                await fetchOrders();
                router.refresh();
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
              <h2 className="text-xl font-normal text-black mb-1">Pedidos</h2>
              <p className="text-sm text-gray-600">Pedidos do balcão</p>
            </div>
            {(() => {
              const balcaoOrders = orders.filter((o) => o.orderType === "BALCAO");
              const balcaoGroups = groupOrdersByTable(balcaoOrders);
              
              return balcaoGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 bg-gray-50/50 rounded-lg border-2 border-dashed border-app-border">
                  <ShoppingCart className="w-12 h-12 text-gray-400 mb-3" />
                  <p className="text-center text-gray-600 font-normal">Nenhum pedido de balcão encontrado</p>
                  <p className="text-center text-gray-500 text-sm mt-1">Os pedidos do balcão aparecerão aqui</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
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
                  "bg-app-card text-black tech-shadow tech-hover transition-all duration-300 cursor-pointer aspect-square",
                  group.hasNewOrders
                    ? "border-2 border-red-500 shadow-md shadow-red-500/20"
                    : group.hasInProduction
                    ? "border-2 border-yellow-500 shadow-md shadow-yellow-500/20"
                    : group.hasOpen
                    ? "border-2 border-green-500 shadow-md shadow-green-500/20"
                    : "border-app-border"
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
                      <Badge variant="secondary" className="text-[9px] px-1 py-0 select-none h-3.5">
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
                    {sortedGroupOrders.length > 0 && sortedGroupOrders[0].items && sortedGroupOrders[0].items.length > 0 && (
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
              <p className="text-sm text-gray-600">Pedidos das mesas (QR Code)</p>
            </div>
            {(() => {
              const mesaOrders = orders.filter((o) => o.orderType === "MESA");
              const mesaGroups = groupOrdersByTable(mesaOrders);
              
              // Criar mapa de mesas ocupadas (por número da mesa)
              const occupiedTables = new Map<number, GroupedOrders>();
              mesaGroups.forEach((group) => {
                if (group.table) {
                  occupiedTables.set(group.table, group);
                }
              });

              // Gerar todas as 20 mesas (01 a 20)
              const allTables = Array.from({ length: 20 }, (_, i) => i + 1);

              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                  {allTables.map((tableNumber) => {
                    const group = occupiedTables.get(tableNumber);
                    const isOccupied = !!group;
                    
                    // Ordenar pedidos dentro do grupo: novos primeiro (se houver)
                    const sortedGroupOrders = group ? [...group.orders].sort((a, b) => {
                      const aNew = !(a.viewed ?? false);
                      const bNew = !(b.viewed ?? false);
                      if (aNew && !bNew) return -1;
                      if (!aNew && bNew) return 1;
                      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                    }) : [];

                    return (
                      <Card
                        key={`MESA_${tableNumber}`}
                        className={cn(
                          "bg-app-card text-black tech-shadow tech-hover transition-all duration-300 aspect-square",
                          isOccupied 
                            ? "border-2 border-orange-500 shadow-md shadow-orange-500/20 cursor-pointer"
                            : "border-2 border-gray-200 cursor-pointer"
                        )}
                        onClick={() => {
                          if (isOccupied && group && group.orders.length > 0) {
                            setSelectedOrder(group.orders[0]?.id || null);
                          }
                        }}
                      >
                        <div className="p-2.5 h-full flex flex-col">
                          <div className="flex items-start justify-between gap-1 mb-auto">
                            <CardTitle className="text-xs font-normal tracking-tight">
                              Mesa {tableNumber.toString().padStart(2, '0')}
                            </CardTitle>
                            {isOccupied && group && (
                              <div className="flex flex-col items-end gap-0.5">
                                {group.hasNewOrders && (
                                  <Badge
                                    variant="destructive"
                                    className="text-[9px] px-1 py-0 select-none animate-pulse h-3.5"
                                  >
                                    Novo
                                  </Badge>
                                )}
                                <Badge variant="secondary" className="text-[9px] px-1 py-0 select-none h-3.5">
                                  {group.orders.length}
                                </Badge>
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-auto space-y-1">
                            {isOccupied && group ? (
                              <>
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-gray-500">Total</span>
                                  <span className="text-xs font-normal text-brand-primary">
                                    {formatPrice(group.total)}
                                  </span>
                                </div>
                                {sortedGroupOrders.length > 0 && sortedGroupOrders[0].items && sortedGroupOrders[0].items.length > 0 && (
                                  <p className="text-[9px] text-gray-600 truncate">
                                    {sortedGroupOrders[0].items.length} itens
                                  </p>
                                )}
                              </>
                            ) : (
                              <p className="text-[10px] text-gray-400 text-center">Livre</p>
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
          await fetchOrders();
          router.refresh();
        }}
        token={token}
      />
    </div>
  );
}
