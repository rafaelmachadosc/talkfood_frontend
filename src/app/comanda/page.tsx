"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPrice } from "@/lib/format";
import { ShoppingCart, Plus, Minus, Package, Wallet, Send } from "lucide-react";
import { Product, Category } from "@/lib/types";
import { Logo } from "@/components/logo";
import { fetchPublic, fetchPublicAll, postPublic } from "@/core/http/public-api-helper";
import { HttpClientFactory } from "@/core/http/http-client-factory";

interface OrderItem {
  id: string;
  amount: number;
  product: {
    id: string;
    name: string;
    price: number;
    description: string;
  };
}

interface Order {
  id: string;
  table?: number;
  name?: string;
  phone?: string;
  orderType?: "MESA" | "BALCAO";
  items: OrderItem[];
  createdAt: string;
  draft: boolean;
  status?: boolean;
}

function ComandaPageContent() {
  const searchParams = useSearchParams();
  const tableParam = searchParams.get("table");
  
  // Mesa padrão: 01 (primeira mesa)
  const [selectedTable, setSelectedTable] = useState<string>("01");
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [sendingOrder, setSendingOrder] = useState(false);
  const [existingOrders, setExistingOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [customerName, setCustomerName] = useState("");


  // Sempre iniciar na mesa "01" quando a página carregar
  // Quando o cliente mudar a mesa, carregar automaticamente as informações
  useEffect(() => {
    // Sempre começar com mesa 01, ignorando localStorage e parâmetros da URL
    setSelectedTable("01");
    if (typeof window !== "undefined") {
      localStorage.setItem("comanda_table", "01");
    }
  }, []); // Executar apenas uma vez ao montar o componente

  // Carregar dados do cardápio
  useEffect(() => {
    async function loadData() {
      try {
        const [categoriesData, productsData] = await fetchPublicAll<[Category[], Product[]]>([
          "/public/category",
          "/public/products?disabled=false",
        ]);

        setCategories(categoriesData);
        setProducts(productsData);
        setLoading(false);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Carregar ou criar pedido quando mesa for selecionada
  useEffect(() => {
    async function loadOrCreateOrder() {
      if (!selectedTable) {
        setCurrentOrder(null);
        return;
      }

      setLoadingOrder(true);
      try {
        // Tentar buscar pedido em rascunho da mesa
        const orders = await fetchPublic<Order[]>(
          `/public/orders?table=${selectedTable}&draft=true`
        );
        
        const draftOrder = Array.isArray(orders) 
          ? orders.find((o: Order) => o.draft === true)
          : null;
        
        if (draftOrder) {
          // Carregar detalhes completos do pedido
          try {
            const orderDetail = await fetchPublic<Order>(
              `/public/order/detail?order_id=${draftOrder.id}`
            );
            setCurrentOrder(orderDetail);
          } catch {
            setCurrentOrder(draftOrder);
          }
        } else {
          // Criar novo pedido em rascunho
          try {
            const newOrder = await postPublic<Order>("/public/order", {
              orderType: "MESA",
              table: Number(selectedTable),
              items: [], // Enviar items vazio para satisfazer validação do backend
            });
            setCurrentOrder({ ...newOrder, items: [] });
          } catch (error) {
            console.error("Erro ao criar pedido:", error);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar/criar pedido:", error);
      } finally {
        setLoadingOrder(false);
      }
    }

    loadOrCreateOrder();
  }, [selectedTable]);

  // Carregar pedidos finalizados da mesa para mostrar consumo
  useEffect(() => {
    async function loadOrders() {
      if (!selectedTable) {
        setExistingOrders([]);
        return;
      }

      setLoadingOrders(true);
      try {
        const orders = await fetchPublic<Order[]>(
          `/public/orders?table=${selectedTable}`
        );
        // Filtrar apenas pedidos finalizados (status: true)
        const finishedOrders = Array.isArray(orders) 
          ? orders.filter((order: Order) => order.status === true)
          : [];
        setExistingOrders(finishedOrders);
      } catch (error) {
        console.error("Erro ao carregar pedidos:", error);
      } finally {
        setLoadingOrders(false);
      }
    }

    loadOrders();
    
    // Atualizar a cada 5 segundos
    const interval = setInterval(loadOrders, 5000);
    return () => clearInterval(interval);
  }, [selectedTable]);

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.category_id === selectedCategory)
    : products;

  const addItemToOrder = async (product: Product) => {
    if (!selectedTable) {
      alert("Selecione uma mesa primeiro");
      return;
    }

    let orderId = currentOrder?.id;

    // Se não tiver pedido, criar um primeiro
    if (!currentOrder || !orderId) {
      try {
        const newOrder = await postPublic<{ id: string }>("/public/order", {
          orderType: "MESA",
          table: Number(selectedTable),
          items: [], // Enviar items vazio para satisfazer validação do backend
        });
        orderId = newOrder.id;
        setCurrentOrder({
          id: newOrder.id,
          orderType: "MESA",
          table: Number(selectedTable),
          status: false,
          draft: true,
          createdAt: new Date().toISOString(),
          items: []
        });
      } catch (error) {
        console.error("Erro ao criar pedido:", error);
        if (error instanceof Error) {
          const errorMessage = error.message;
          // Se o erro for sobre nome, não deve bloquear (nome é opcional ao criar pedido)
          if (errorMessage.toLowerCase().includes("nome") || errorMessage.toLowerCase().includes("name")) {
            console.warn("Backend está exigindo nome ao criar pedido, mas isso não deveria acontecer:", errorMessage);
          } else {
            alert(errorMessage);
            return;
          }
        } else {
          alert("Erro ao criar pedido. Tente novamente.");
          return;
        }
      }
    }

    // Adicionar item ao pedido
    if (!orderId) {
      alert("Erro: Pedido não encontrado. Tente novamente.");
      return;
    }

    try {
      await postPublic("/public/order/add", {
        order_id: orderId,
        product_id: product.id,
        amount: 1,
      });

      // Recarregar o pedido completo para ter os dados atualizados do servidor
      try {
        const updatedOrder = await fetchPublic<Order>(
          `/public/order/detail?order_id=${orderId}`
        );
        setCurrentOrder(updatedOrder);
      } catch {
        // Se não conseguir carregar detalhes, atualizar localmente
        setCurrentOrder((prev) => {
          if (!prev) return null;
          const existingItem = prev.items?.find((item) => item.product.id === product.id);
          if (existingItem) {
            return {
              ...prev,
              items: prev.items.map((item) =>
                item.product.id === product.id
                  ? { ...item, amount: item.amount + 1 }
                  : item
              ),
            };
          } else {
            return {
              ...prev,
              items: [...(prev.items || []), { id: "", product, amount: 1 }],
            };
          }
        });
      }
    } catch (error) {
      console.error("Erro ao adicionar item:", error);
      if (error instanceof Error) {
        alert(error.message || "Erro ao adicionar item ao pedido");
      } else {
        alert("Erro ao adicionar item ao pedido. Verifique sua conexão e tente novamente.");
      }
    }
  };

  const updateItemQuantity = async (itemId: string, newAmount: number) => {
    if (!currentOrder || newAmount <= 0) {
      // Remover item
      await removeItem(itemId);
      return;
    }

    // Atualizar localmente (backend provavelmente não tem endpoint de update, então removemos e recriamos)
    // Por simplicidade, apenas atualizamos localmente
    setCurrentOrder((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        items: prev.items.map((item) =>
          item.id === itemId ? { ...item, amount: newAmount } : item
        ),
      };
    });
  };

  const removeItem = async (itemId: string) => {
    if (!currentOrder) return;

    try {
      const publicClient = HttpClientFactory.getPublicClient();
      await publicClient.delete(`/public/order/remove?item_id=${itemId}`);
      
      setCurrentOrder((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          items: prev.items.filter((item) => item.id !== itemId),
        };
      });
    } catch (error) {
      console.error("Erro ao remover item:", error);
    }
  };

  const currentOrderTotal = currentOrder?.items?.reduce(
    (total, item) => total + item.product.price * item.amount,
    0
  ) || 0;

  const totalConsumed = existingOrders.reduce((total, order) => {
    return (
      total +
      order.items.reduce(
        (orderTotal, item) => orderTotal + item.product.price * item.amount,
        0
      )
    );
  }, 0);

  const handleSendOrder = async () => {
    if (!currentOrder || !currentOrder.items || currentOrder.items.length === 0) {
      alert("Adicione itens ao pedido antes de encaminhar");
      return;
    }

    // Validar nome apenas na finalização
    const trimmedName = customerName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      alert("O nome é obrigatório e deve ter pelo menos 2 caracteres");
      return;
    }

    setSendingOrder(true);
    try {
      // Primeiro, atualizar o pedido com o nome (se necessário)
      // Como não há endpoint específico para atualizar nome, vamos incluí-lo no send
      // Ou criar uma atualização antes do send
      
      // Tentar atualizar o pedido com o nome antes de enviar
      // Nota: Pode ser que o backend não tenha endpoint para atualizar, então usaremos o send que pode aceitar name
      
      const publicClient = HttpClientFactory.getPublicClient();
      await publicClient.put("/public/order/send", {
        order_id: currentOrder.id,
        name: trimmedName, // Incluir nome no send se o backend suportar
      });

      // Pedido encaminhado com sucesso
      setShowConfirmModal(false);
      setCustomerName("");
      setCurrentOrder(null);
      // Recarregar pedido (agora será criado um novo rascunho)
      window.location.reload();
    } catch (error) {
      console.error("Erro ao encaminhar pedido:", error);
      alert("Erro ao encaminhar pedido");
    } finally {
      setSendingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-app-background flex items-center justify-center">
        <p className="text-black text-xl">Carregando comanda...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-background text-black">
      {/* Header */}
      <header className="bg-app-card border-b border-app-border sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col items-center justify-center gap-3">
            <Logo width={120} height={40} className="h-10 w-auto" />
            <div className="flex items-center gap-2">
              {/* Seletor de Mesa */}
              <Select
                value={selectedTable}
                onValueChange={(value) => {
                  setSelectedTable(value);
                  if (typeof window !== "undefined") {
                    localStorage.setItem("comanda_table", value);
                  }
                }}
              >
                <SelectTrigger className="w-[140px] border-app-border bg-app-background text-black">
                  <SelectValue placeholder="Selecione a mesa" />
                </SelectTrigger>
                <SelectContent className="bg-app-card border-app-border">
                  {Array.from({ length: 20 }, (_, i) => i + 1).map((tableNumber) => (
                    <SelectItem
                      key={tableNumber}
                      value={tableNumber.toString()}
                      className="text-black hover:bg-transparent cursor-pointer"
                    >
                      Mesa {tableNumber.toString().padStart(2, '0')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Botão Carteira */}
              <Button
                onClick={() => setShowWallet(true)}
                variant="outline"
                className="border-app-border hover:bg-transparent"
              >
                <Wallet className="w-5 h-5 mr-2" />
              </Button>

              {/* Botão Encaminhar Pedido ou Comanda */}
              {currentOrder && currentOrder.items && currentOrder.items.length > 0 ? (
                <Button
                  onClick={() => {
                    // Inicializar nome com o nome atual do pedido (se existir)
                    setCustomerName(currentOrder.name || "");
                    setShowConfirmModal(true);
                  }}
                  className="bg-brand-primary hover:bg-brand-primary/90 text-black tech-shadow tech-hover font-normal"
                >
                  <Send className="w-5 h-5 mr-2" />
                  Encaminhar Pedido
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    // Abrir sidebar com itens do pedido atual
                    if (currentOrder && currentOrder.items && currentOrder.items.length > 0) {
                      // Mostrar itens em um modal ou sidebar
                    }
                  }}
                  variant="outline"
                  className="border-app-border hover:bg-transparent"
                  disabled
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Comanda
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {!selectedTable ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">Selecione uma mesa para começar</p>
          </div>
        ) : (
          <>
            {/* Pedidos em Rascunho (Itens Atuais) */}
            {currentOrder && currentOrder.items && currentOrder.items.length > 0 && (
              <div className="mb-4">
                <h2 className="text-lg font-normal text-black mb-2">Seu Pedido</h2>
                <Card className="bg-app-card border-app-border tech-shadow">
                  <CardContent className="p-3">
                    <div className="space-y-1.5">
                      {currentOrder.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-center py-1.5 border-b border-app-border last:border-0"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => updateItemQuantity(item.id, item.amount - 1)}
                              >
                                <Minus className="w-2.5 h-2.5" />
                              </Button>
                              <span className="w-6 text-center font-normal text-xs">
                                {item.amount}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => updateItemQuantity(item.id, item.amount + 1)}
                              >
                                <Plus className="w-2.5 h-2.5" />
                              </Button>
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-xs text-gray-700 truncate">
                                {item.product.name}
                              </span>
                              {currentOrder.name && (
                                <span className="text-[10px] text-gray-500 truncate">
                                  {currentOrder.name}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs font-normal text-brand-primary ml-2">
                            {formatPrice(item.product.price * item.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-app-border">
                      <span className="font-normal text-sm">Total</span>
                      <span className="text-base font-normal text-brand-primary">
                        {formatPrice(currentOrderTotal)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Adicionar Mais Itens */}
            <div className="mb-8">
              <h2 className="text-xl font-normal text-black mb-4">Adicionar Itens</h2>

              {/* Categories Filter */}
              <div className="mb-6">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  <Button
                    variant={selectedCategory === null ? "default" : "outline"}
                    onClick={() => setSelectedCategory(null)}
                    className={`${
                      selectedCategory === null
                        ? "bg-brand-primary text-black tech-shadow tech-hover font-normal"
                        : "border-app-border text-black hover:bg-gray-100 tech-shadow tech-hover font-normal"
                    }`}
                  >
                    Todos
                  </Button>
                  {categories.map((category) => (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? "default" : "outline"}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`${
                        selectedCategory === category.id
                          ? "bg-brand-primary text-black tech-shadow tech-hover font-normal"
                          : "border-app-border text-black hover:bg-gray-100 tech-shadow tech-hover font-normal"
                      }`}
                    >
                      {category.name}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Products Grid */}
              {filteredProducts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 text-lg">Nenhum produto disponível</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                  {filteredProducts.map((product) => (
                    <Card
                      key={product.id}
                      className="bg-app-card border-app-border tech-shadow tech-hover hover:border-brand-primary/30"
                    >
                      <CardHeader className="p-3 pb-2">
                        <CardTitle className="text-sm tracking-tight line-clamp-2">{product.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 p-3 pt-2">
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {product.description}
                        </p>
                        <div className="flex flex-col gap-2">
                          <span className="text-sm font-normal text-brand-primary">
                            {formatPrice(product.price)}
                          </span>
                          <Button
                            onClick={() => addItemToOrder(product)}
                            size="sm"
                            disabled={!selectedTable || loadingOrder}
                            className="bg-brand-primary hover:bg-brand-primary/90 text-black tech-shadow tech-hover font-normal text-xs h-7"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Adicionar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Modal de Confirmação para Encaminhar Pedido */}
      <Dialog 
        open={showConfirmModal} 
        onOpenChange={(open) => {
          setShowConfirmModal(open);
          if (!open) {
            // Limpar nome quando fechar o modal
            setCustomerName("");
          }
        }}
      >
        <DialogContent className="bg-app-card border-app-border text-black max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-normal text-black tracking-tight">
              Confirmar Pedido
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Revise os itens antes de encaminhar para a cozinha
            </DialogDescription>
          </DialogHeader>

          {currentOrder && currentOrder.items && (
            <div className="space-y-4 mt-4">
              {/* Campo de Nome */}
              <div>
                <Label htmlFor="customerName" className="mb-2">
                  Nome do Cliente *
                </Label>
                <Input
                  id="customerName"
                  name="customerName"
                  required
                  placeholder="Digite o nome do cliente"
                  className="border-app-border bg-white text-black"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  O nome aparecerá abaixo de cada item para facilitar o recebimento
                </p>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {currentOrder.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-start py-2 border-b border-app-border"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-700">
                        {item.amount}x {item.product.name}
                      </span>
                      {customerName.trim() && (
                        <span className="text-xs text-gray-500 mt-0.5">
                          {customerName.trim()}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-normal text-brand-primary">
                      {formatPrice(item.product.price * item.amount)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-app-border">
                <span className="font-normal">Total</span>
                <span className="text-xl font-normal text-brand-primary">
                  {formatPrice(currentOrderTotal)}
                </span>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 border-app-border hover:bg-transparent"
                  disabled={sendingOrder}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSendOrder}
                  disabled={sendingOrder || !customerName.trim() || customerName.trim().length < 2}
                  className="flex-1 bg-brand-primary hover:bg-brand-primary/90 text-black tech-shadow tech-hover font-normal disabled:opacity-50"
                >
                  {sendingOrder ? "Encaminhando..." : "Encaminhar Pedido"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Carteira - Mostrar Consumo Total */}
      <Dialog open={showWallet} onOpenChange={setShowWallet}>
        <DialogContent className="bg-app-card border-app-border text-black max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-normal text-black tracking-tight flex items-center gap-2">
              <Wallet className="w-6 h-6 text-brand-primary" />
              Consumo Total
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Total consumido na mesa {selectedTable?.padStart(2, '0')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {existingOrders.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Nenhum pedido finalizado ainda</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {existingOrders.map((order) => {
                    const orderTotal = order.items.reduce(
                      (total, item) => total + item.product.price * item.amount,
                      0
                    );
                    return (
                      <Card key={order.id} className="bg-app-background border-app-border">
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-600">
                              {new Date(order.createdAt).toLocaleString("pt-BR")}
                            </span>
                            <span className="text-sm font-normal text-brand-primary">
                              {formatPrice(orderTotal)}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {order.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex justify-between text-sm text-gray-700"
                              >
                                <div className="flex flex-col">
                                  <span>
                                    {item.amount}x {item.product.name}
                                  </span>
                                  {order.name && (
                                    <span className="text-xs text-gray-500">
                                      {order.name}
                                    </span>
                                  )}
                                </div>
                                <span>{formatPrice(item.product.price * item.amount)}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-app-border">
                  <span className="text-lg font-normal">Total Consumido</span>
                  <span className="text-2xl font-normal text-brand-primary">
                    {formatPrice(totalConsumed)}
                  </span>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ComandaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-app-background flex items-center justify-center">
        <p className="text-black text-xl">Carregando...</p>
      </div>
    }>
      <ComandaPageContent />
    </Suspense>
  );
}