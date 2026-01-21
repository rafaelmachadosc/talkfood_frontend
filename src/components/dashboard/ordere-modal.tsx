import { apiClient } from "@/lib/api";
import { Order, Product, Category } from "@/lib/types";
import { useEffect, useState } from "react";
import { orderEventHelpers } from "@/lib/order-events";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { formatPrice } from "@/lib/format";
import { finishOrderAction, receiveOrderAction } from "@/actions/orders";
import { useRouter } from "next/navigation";
import { Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderModalProps {
  orderId: string | null;
  onClose: () => Promise<void>;
  token: string;
  isKitchen?: boolean; // Se true, oculta botões de ação e total (modo visualização cozinha)
}

export function OrderModal({ onClose, orderId, token, isKitchen = false }: OrderModalProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [receivedAmount, setReceivedAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("DINHEIRO");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const router = useRouter();

  const fetchOrder = async (showLoading = true) => {
    if (!orderId) {
      setOrder(null);
      return;
    }

    try {
      if (showLoading) {
        setLoading(true);
      }

      const response = await apiClient<Order>(
        `/api/order/detail?order_id=${orderId}`,
        {
          method: "GET",
          token: token,
        }
      );

      // RETORNO DETALHE DA ORDER
      if (response) {
        setOrder(response);
      }

      if (showLoading) {
        setLoading(false);
      }
    } catch (err) {
      if (showLoading) {
        setLoading(false);
      }
      console.error("Erro ao buscar pedido:", err);
      // Não limpar o order para manter o modal aberto mesmo com erro
    }
  };

  useEffect(() => {
    async function loadOrders() {
      if (orderId) {
        await fetchOrder();
      } else {
        setOrder(null);
        setLoading(false);
      }
    }

    loadOrders();
  }, [orderId, token]);

  // Atualizar automaticamente quando o modal estiver aberto
  useEffect(() => {
    if (!orderId) return;

    // Atualizar a cada 3 segundos quando o modal estiver aberto (sem mostrar loading)
    const interval = setInterval(() => {
      fetchOrder(false);
    }, 3000);

    return () => clearInterval(interval);
  }, [orderId, token]);

  // Selecionar todos os itens quando o pedido é carregado (se ainda não foi enviado para produção)
  useEffect(() => {
    if (order && order.draft && order.items) {
      // Inicializar com todos os itens selecionados
      const allItemIds = new Set(order.items.map((item) => item.id));
      setSelectedItems(allItemIds);
    } else if (order && !order.draft) {
      // Se o pedido foi enviado para produção, limpar seleção
      setSelectedItems(new Set());
    }
  }, [order]);

  // Carregar produtos e categorias quando o modal abrir
  useEffect(() => {
    async function loadProductsAndCategories() {
      if (!orderId) return;
      
      try {
        const [categoriesData, productsData] = await Promise.all([
          apiClient<Category[]>("/api/category", {
            method: "GET",
            token: token,
          }),
          apiClient<Product[]>("/api/products", {
            method: "GET",
            token: token,
          }),
        ]);

        setCategories(categoriesData);
        setProducts(productsData);
      } catch (err) {
        console.error("Erro ao carregar produtos e categorias:", err);
      }
    }

    if (orderId) {
      loadProductsAndCategories();
    }
  }, [orderId, token]);

  // Selecionar todos os itens quando o pedido é carregado (se ainda não foi enviado para produção)
  useEffect(() => {
    if (order && order.draft && order.items) {
      // Inicializar com todos os itens selecionados
      const allItemIds = new Set(order.items.map((item) => item.id));
      setSelectedItems(allItemIds);
    } else if (order && !order.draft) {
      // Se o pedido foi enviado para produção, limpar seleção
      setSelectedItems(new Set());
    }
  }, [order]);

  // Calcula o total do pedido
  const calculateTotal = () => {
    if (!order?.items) return 0;
    return order.items.reduce((total, item) => {
      return total + item.product.price * item.amount;
    }, 0);
  };

  // Calcula o total dos itens selecionados
  const calculateSelectedTotal = () => {
    if (!order?.items) return 0;
    return order.items
      .filter((item) => selectedItems.has(item.id))
      .reduce((total, item) => {
        return total + item.product.price * item.amount;
      }, 0);
  };

  const handleSendOrder = async () => {
    if (!orderId || !order) return;

    setLoading(true);
    try {
      const orderName = order.orderType === "MESA" 
        ? `Mesa ${order.table || ""}${order.name ? ` - ${order.name}` : ""}`
        : order.name || "Pedido no Balcão";

      const response = await apiClient<Order>(`/api/order/send`, {
        method: "PUT",
        token: token,
        body: JSON.stringify({
          order_id: orderId,
          name: orderName,
        }),
      });

      // Atualizar o pedido diretamente com a resposta da API
      if (response) {
        setOrder(response);
      } else {
        // Se a resposta não vier com os dados completos, recarregar do servidor
        await fetchOrder(false);
      }
      
      setLoading(false);
      // Notificar componentes sobre pedido enviado para cozinha
      orderEventHelpers.notifyOrderUpdated();
      // Atualizar a lista de pedidos no background sem fechar o modal
      router.refresh();
    } catch (error) {
      console.error("Erro ao enviar pedido:", error);
      alert(error instanceof Error ? error.message : "Erro ao enviar pedido para cozinha");
      setLoading(false);
    }
  };

  const handleFinishOrder = async () => {
    if (!orderId || !order) return;

    // Verificar se o pedido já está finalizado
    if (order.status) {
      alert("Este pedido já foi finalizado.");
      await fetchOrder(false);
      router.refresh();
      return;
    }

    setLoading(true);
    try {
      const result = await finishOrderAction(orderId);

      if (!result.success) {
        const errorMsg = result.error || "Erro ao finalizar pedido";
        console.error("Erro ao finalizar pedido:", errorMsg);
        
        // Atualizar o pedido para verificar se mudou de status
        await fetchOrder(false);
        
        // Se o erro mencionar que já foi finalizado, não mostrar alerta duplicado
        if (!errorMsg.includes("já foi finalizado") && !errorMsg.includes("já foi recebido")) {
          alert(errorMsg);
        }
        
        setLoading(false);
        return;
      }

      // Atualizar o pedido após finalizar (sem mostrar loading)
      await fetchOrder(false);
      
      // Notificar componentes sobre pedido finalizado
      orderEventHelpers.notifyOrderFinished();
      
      // Fechar o modal e atualizar a lista
      router.refresh();
      setLoading(false);
      onClose();
    } catch (error) {
      console.error("Erro ao finalizar pedido:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro ao finalizar pedido";
      
      // Atualizar o pedido para verificar se mudou de status
      await fetchOrder(false);
      
      // Verificar se a mensagem já indica que foi finalizado
      if (!errorMessage.includes("já foi finalizado") && !errorMessage.includes("já foi recebido")) {
        alert(errorMessage);
      }
      
      setLoading(false);
    }
  };

  const handleCloseOrder = async () => {
    if (!orderId || !order) return;

    const confirmClose = confirm("Tem certeza que deseja fechar este pedido? Todos os itens serão removidos e a mesa voltará para o estado desocupado.");
    if (!confirmClose) return;

    setLoading(true);
    try {
      // Deletar o pedido (sem criar novo, para que a mesa volte ao estado desocupado)
      try {
        await apiClient(`/api/order?order_id=${orderId}`, {
          method: "DELETE",
          token: token,
        });
      } catch (deleteError) {
        console.error("Erro ao deletar pedido:", deleteError);
        // Se o erro for sobre pedido não encontrado, continuar mesmo assim
        if (deleteError instanceof Error && !deleteError.message.includes("404")) {
          throw deleteError;
        }
      }

      // Notificar componentes sobre pedido deletado
      orderEventHelpers.notifyOrderDeleted();
      // Atualizar a lista de pedidos e fechar o modal
      router.refresh();
      setLoading(false);
      onClose();
    } catch (error) {
      console.error("Erro ao fechar pedido:", error);
      alert(error instanceof Error ? error.message : "Erro ao fechar pedido");
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!orderId || !selectedProduct) return;

    try {
      await apiClient("/api/order/add", {
        method: "POST",
        token: token,
        body: JSON.stringify({
          order_id: orderId,
          product_id: selectedProduct,
          amount: quantity,
        }),
      });

      await fetchOrder(); // Recarregar o pedido
      setShowAddItem(false);
      setSelectedProduct(null);
      setQuantity(1);
      
      // Notificar componentes sobre atualização do pedido
      orderEventHelpers.notifyOrderUpdated();
      router.refresh();
    } catch (error) {
      console.error("Erro ao adicionar item:", error);
      alert(error instanceof Error ? error.message : "Erro ao adicionar item");
    }
  };

  const calculateChange = () => {
    const received = parseFloat(receivedAmount.replace(/[^\d,]/g, "").replace(",", ".")) || 0;
    // Usar total selecionado se houver seleção parcial, senão usar total completo
    const total = order?.draft && selectedItems.size > 0 && selectedItems.size < (order.items?.length || 0)
      ? calculateSelectedTotal()
      : calculateTotal();
    const change = received - total / 100;
    return change >= 0 ? change : 0;
  };

  const handleReceiveOrder = async () => {
    if (!orderId || !order) return;

    // Verificar se o pedido já está finalizado antes de tentar receber
    if (order.status) {
      alert("Este pedido já foi finalizado e recebido.");
      setShowReceive(false);
      await fetchOrder(false);
      router.refresh();
      return;
    }

    // Validar se há itens selecionados
    if (order.draft && selectedItems.size === 0) {
      alert("Selecione pelo menos um item para receber.");
      return;
    }

    // Usar total selecionado se houver seleção parcial, senão usar total completo
    const selectedTotal = order.draft && selectedItems.size > 0 && selectedItems.size < (order.items?.length || 0)
      ? calculateSelectedTotal()
      : calculateTotal();
    
    const received = paymentMethod === "DINHEIRO" 
      ? parseFloat(receivedAmount.replace(/[^\d,]/g, "").replace(",", ".")) || 0
      : selectedTotal / 100;
    const total = selectedTotal / 100;
    
    if (paymentMethod === "DINHEIRO" && received < total) {
      alert("Valor recebido é menor que o total do pedido");
      return;
    }

    setReceiving(true);
    try {
      const result = await receiveOrderAction(orderId, paymentMethod, received);

      if (!result.success) {
        const errorMsg = result.error || "Erro ao receber pedido";
        console.error("Erro ao receber pedido:", errorMsg);
        
        // Atualizar o pedido para verificar se mudou de status
        await fetchOrder(false);
        
        // Fechar modal de recebimento se o pedido já foi finalizado
        if (errorMsg.includes("já foi finalizado") || errorMsg.includes("já foi recebido")) {
          setShowReceive(false);
          setReceivedAmount("");
          setPaymentMethod("DINHEIRO");
        }
        
        // Mostrar alerta apenas se não for erro de "já finalizado" (já validamos antes)
        if (!errorMsg.includes("já foi finalizado") && !errorMsg.includes("já foi recebido")) {
          alert(errorMsg);
        }
        
        setReceiving(false);
        router.refresh();
        return;
      }

      // Notificar componentes sobre pedido recebido
      orderEventHelpers.notifyOrderReceived();

      // Sucesso: fechar modal de recebimento e atualizar
      setShowReceive(false);
      setReceivedAmount("");
      setPaymentMethod("DINHEIRO");
      router.refresh();
      setReceiving(false);
      onClose();
    } catch (error) {
      console.error("Erro ao receber pedido:", error);
      alert(error instanceof Error ? error.message : "Erro ao receber pedido");
      // Atualizar o pedido para verificar se mudou de status
      await fetchOrder(false);
      setReceiving(false);
    }
  };

  return (
    <Dialog open={orderId !== null} onOpenChange={() => onClose()}>
      <DialogContent className="p-6 bg-app-card text-black max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-normal tracking-tight">
            Detalhe do pedido
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-gray-600">Carregando...</p>
          </div>
        ) : order ? (
          <div className="space-y-6">
            {/* Informações do pedido */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Modalidade</p>
                <p className="text-lg font-normal">
                  {order.orderType === "MESA" 
                    ? `Pedido na Mesa ${order.table ? order.table : ""}` 
                    : "Pedido no Balcão"}
                </p>
              </div>
              {order.name && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Cliente</p>
                  <p className="text-lg font-normal">{order.name}</p>
                </div>
              )}
              {order.phone && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Telefone</p>
                  <p className="text-lg font-normal">{order.phone}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600 mb-1">Status</p>
                {order.status ? (
                  <span className="inline-block px-3 py-1 bg-green-500/20 text-green-500 rounded-full font-medium text-xs">
                    Finalizado
                  </span>
                ) : order.draft ? (
                  <span className="inline-block px-3 py-1 bg-green-500/20 text-green-500 rounded-full font-medium text-xs">
                    Aberto
                  </span>
                ) : (
                  <span className="inline-block px-3 py-1 bg-orange-500/20 text-orange-500 rounded-full font-medium text-xs">
                    Em produção
                  </span>
                )}
              </div>
            </div>

            {/* Itens do pedido */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-normal">Itens do pedido</h3>
                {!order.status && !isKitchen && (
                  <Button
                    size="sm"
                    onClick={() => setShowAddItem(true)}
                    className="bg-brand-primary hover:bg-brand-primary/90 text-black tech-shadow tech-hover font-normal"
                  >
                    <Plus className="w-4 h-4 mr-1 icon-3d" />
                    Adicionar Item
                  </Button>
                )}
              </div>
              <div className="space-y-3">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item) => {
                    const subtotal = item.product.price * item.amount;
                    const isSelected = selectedItems.has(item.id);
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "bg-white rounded-lg p-4 border transition-colors",
                          isSelected && !isKitchen && order.draft
                            ? "border-green-500 bg-green-50/30"
                            : "border-app-border"
                        )}
                      >
                        <div className="flex justify-between items-start gap-3">
                          {!isKitchen && order.draft && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const newSelected = new Set(selectedItems);
                                if (e.target.checked) {
                                  newSelected.add(item.id);
                                } else {
                                  newSelected.delete(item.id);
                                }
                                setSelectedItems(newSelected);
                              }}
                              className="w-5 h-5 mt-1 text-green-500 border-app-border rounded cursor-pointer focus:ring-green-500"
                            />
                          )}
                          <div className="flex-1">
                            <h4 className="font-normal text-base mb-1">
                              {item.product.name}
                            </h4>
                            {!isKitchen && (
                              <>
                                <p className="text-sm text-gray-600">
                                  {item.product.description}
                                </p>
                                <p className="text-sm text-gray-600 mt-2">
                                  {formatPrice(item.product.price)} x {item.amount}
                                </p>
                              </>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-sm text-gray-600 mb-1">
                              Quantidade: {item.amount}
                            </p>
                            {!isKitchen && (
                              <p className="font-normal text-lg">
                                Subtotal: {formatPrice(subtotal)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-600 text-center py-4">
                    Nenhum item no pedido
                  </p>
                )}
              </div>
            </div>

            {/* Total - ocultar na tela Cozinha */}
            {!isKitchen && (
              <div className="border-t border-app-border pt-4 space-y-2">
                {order.draft && selectedItems.size > 0 && selectedItems.size < (order.items?.length || 0) && (
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-normal text-gray-600">Total Selecionado</span>
                    <span className="text-xl font-normal text-orange-500">
                      {formatPrice(calculateSelectedTotal())}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-xl font-normal">Total</span>
                  <span className="text-2xl font-normal text-brand-primary">
                    {formatPrice(calculateTotal())}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {order && !isKitchen && (
          <DialogFooter className="flex gap-2 sm:gap-2">
            {order.draft ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleCloseOrder}
                  className="flex-1 border-app-border hover:bg-red-50 bg-transparent text-red-600 hover:text-red-700"
                  disabled={loading}
                >
                  Fechar Pedido
                </Button>
                <Button
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white tech-shadow tech-hover font-normal"
                  disabled={loading || selectedItems.size === 0}
                  onClick={handleSendOrder}
                >
                  Produzir
                </Button>
                <Button
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white tech-shadow tech-hover font-normal"
                  disabled={loading || receiving || selectedItems.size === 0}
                  onClick={() => setShowReceive(true)}
                >
                  Receber
                </Button>
              </>
            ) : order.status ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleCloseOrder}
                  className="flex-1 border-app-border hover:bg-red-50 bg-transparent text-red-600 hover:text-red-700"
                  disabled={loading}
                >
                  Fechar Pedido
                </Button>
                <Button
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white tech-shadow tech-hover font-normal"
                  disabled={loading || receiving}
                  onClick={() => setShowReceive(true)}
                >
                  Receber
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleCloseOrder}
                  className="flex-1 border-app-border hover:bg-red-50 bg-transparent text-red-600 hover:text-red-700"
                  disabled={loading}
                >
                  Fechar Pedido
                </Button>
                <Button
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white tech-shadow tech-hover font-normal"
                  disabled={loading}
                  onClick={handleFinishOrder}
                >
                  Finalizar pedido
                </Button>
              </>
            )}
          </DialogFooter>
        )}
      </DialogContent>

      {/* Dialog: Adicionar Item */}
      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent className="bg-app-card border-app-border text-black max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-normal tracking-tight">
              Adicionar Item ao Pedido
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Selecione o produto e a quantidade
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="category" className="mb-2">
                Categoria
              </Label>
              <Select value={selectedCategory || "all"} onValueChange={(value) => setSelectedCategory(value === "all" ? null : value)}>
                <SelectTrigger className="border-app-border bg-white text-black">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent className="bg-app-card border-app-border">
                  <SelectItem value="all" className="text-black hover:bg-transparent cursor-pointer">
                    Todas as categorias
                  </SelectItem>
                  {categories.map((category) => (
                    <SelectItem
                      key={category.id}
                      value={category.id}
                      className="text-black hover:bg-transparent cursor-pointer"
                    >
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="product" className="mb-2">
                Produto *
              </Label>
              <Select
                value={selectedProduct || ""}
                onValueChange={setSelectedProduct}
                required
              >
                <SelectTrigger className="border-app-border bg-white text-black">
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent className="bg-app-card border-app-border max-h-60">
                  {products
                    .filter((p) => !p.disabled && (selectedCategory === null || p.category_id === selectedCategory))
                    .map((product) => (
                      <SelectItem
                        key={product.id}
                        value={product.id}
                        className="text-black hover:bg-transparent cursor-pointer"
                      >
                        {product.name} - {formatPrice(product.price)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="quantity" className="mb-2">
                Quantidade *
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="border-app-border"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="border-app-border bg-white text-black text-center w-20"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(quantity + 1)}
                  className="border-app-border"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddItem(false);
                  setSelectedProduct(null);
                  setQuantity(1);
                }}
                className="flex-1 border-app-border hover:bg-transparent text-black"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAddItem}
                disabled={!selectedProduct}
                className="flex-1 bg-brand-primary hover:bg-brand-primary/90 text-black tech-shadow tech-hover font-normal"
              >
                Adicionar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Receber Pedido */}
      <Dialog open={showReceive} onOpenChange={setShowReceive}>
        <DialogContent className="bg-app-card border-app-border text-black max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-normal tracking-tight">
              Receber Pedido
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Informe o valor recebido e método de pagamento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="bg-white rounded-lg p-4 border border-app-border">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">
                  {order?.draft && selectedItems.size > 0 && selectedItems.size < (order.items?.length || 0)
                    ? "Total Selecionado:"
                    : "Total do Pedido:"}
                </span>
                <span className="text-lg font-normal text-brand-primary">
                  {formatPrice(
                    order?.draft && selectedItems.size > 0 && selectedItems.size < (order.items?.length || 0)
                      ? calculateSelectedTotal()
                      : calculateTotal()
                  )}
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="paymentMethod" className="mb-2">
                Método de Pagamento *
              </Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod} required>
                <SelectTrigger className="border-app-border bg-white text-black">
                  <SelectValue placeholder="Selecione o método" />
                </SelectTrigger>
                <SelectContent className="bg-app-card border-app-border">
                  <SelectItem value="DINHEIRO" className="text-black hover:bg-transparent cursor-pointer">
                    Dinheiro
                  </SelectItem>
                  <SelectItem value="CARTAO_DEBITO" className="text-black hover:bg-transparent cursor-pointer">
                    Cartão de Débito
                  </SelectItem>
                  <SelectItem value="CARTAO_CREDITO" className="text-black hover:bg-transparent cursor-pointer">
                    Cartão de Crédito
                  </SelectItem>
                  <SelectItem value="PIX" className="text-black hover:bg-transparent cursor-pointer">
                    PIX
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentMethod === "DINHEIRO" && (
              <div>
                <Label htmlFor="receivedAmount" className="mb-2">
                  Valor Recebido (R$) *
                </Label>
                <Input
                  id="receivedAmount"
                  type="text"
                  placeholder="0,00"
                  className="border-app-border bg-white text-black"
                  value={receivedAmount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d,]/g, "");
                    setReceivedAmount(value);
                  }}
                />
                {receivedAmount && calculateChange() > 0 && (
                  <p className="text-sm text-green-600 mt-2 font-normal">
                    Troco: {formatPrice(calculateChange())}
                  </p>
                )}
                {receivedAmount && calculateChange() < 0 && (
                  <p className="text-sm text-red-600 mt-2">
                    Valor insuficiente. Faltam: {formatPrice(Math.abs(calculateChange()))}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowReceive(false);
                  setReceivedAmount("");
                  setPaymentMethod("DINHEIRO");
                }}
                className="flex-1 border-app-border hover:bg-transparent text-black"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleReceiveOrder}
                disabled={receiving || (paymentMethod === "DINHEIRO" && (!receivedAmount || calculateChange() < 0))}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white tech-shadow tech-hover font-normal"
              >
                {receiving ? "Recebendo..." : "Confirmar Recebimento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
