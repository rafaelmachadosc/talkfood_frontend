"use client";

import { useState } from "react";
import { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createPublicOrderAction } from "@/actions/menu";
import { Loader2 } from "lucide-react";
import { formatPrice } from "@/lib/format";

interface CartItem {
  product: Product;
  quantity: number;
}

interface MenuCheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  total: number;
  onSuccess: (orderId?: string, table?: number, phone?: string) => void;
}

export function MenuCheckout({
  isOpen,
  onClose,
  cart,
  total,
  onSuccess,
}: MenuCheckoutProps) {
  const [table, setTable] = useState("");
  const [comanda, setComanda] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  function printRawData(rawData: string) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Não foi possível abrir a janela de impressão.");
      return;
    }
    printWindow.document.write(
      `<html><head><title>Cupom</title></head><body><pre style="font-family: monospace; font-size: 12px;">${rawData}</pre><script>window.print();</script></body></html>`
    );
    printWindow.document.close();
  }

  async function handlePrintReceipt(orderId: string) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!baseUrl) {
        return;
      }
      const response = await fetch(`${baseUrl}/api/print/receipt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          receiptType: "ORDER",
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success || !data?.rawData) {
        return;
      }
      printRawData(data.rawData);
    } catch {
      // impressão é opcional; não interromper o fluxo do pedido
    }
  }

  function formatPhone(value: string) {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 10) {
      return numbers
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }
    return numbers
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!table || !comanda) {
      setError("Por favor, preencha todos os campos obrigatórios");
      setIsLoading(false);
      return;
    }

    if (!cart || cart.length === 0) {
      setError("É necessário adicionar pelo menos um item ao pedido. Adicione produtos ao carrinho antes de finalizar.");
      setIsLoading(false);
      return;
    }

    try {
      // Validar itens do carrinho
      const validItems = cart
        .filter((item) => item.product && item.product.id && item.quantity > 0)
        .map((item) => ({
          product_id: item.product.id,
          amount: item.quantity,
        }));

      if (validItems.length === 0) {
        setError("É necessário adicionar pelo menos um item válido ao pedido. Verifique se os produtos estão corretos.");
        setIsLoading(false);
        return;
      }

      const result = await createPublicOrderAction({
        orderType: "MESA",
        table: Number(table),
        name: comanda,
        comanda,
        phone: phone || undefined,
        items: validItems,
      });

      if (result.success) {
        onSuccess(result.orderId, Number(table), phone || undefined);
        if (result.orderId) {
          await handlePrintReceipt(result.orderId);
        }
        setTable("");
        setComanda("");
        setPhone("");
        setError("");
      } else {
        setError(result.error || "Erro ao criar pedido");
      }
    } catch (err) {
      setError("Erro ao processar pedido. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-app-card border-app-border text-black max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-3xl sm:text-4xl font-normal text-black tracking-tight">
            Solicitar Pedido
          </DialogTitle>
          <DialogDescription className="text-gray-600 text-lg">
            Preencha os dados para solicitar seu pedido
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="table" className="mb-2">
              Número da Mesa *
            </Label>
            <Input
              id="table"
              name="table"
              type="text"
              required
              placeholder="Ex: 5"
              className="border-app-border bg-white text-black text-lg py-3"
              value={table}
              onChange={(e) => setTable(e.target.value)}
              min="1"
            />
          </div>

          <div>
            <Label htmlFor="name" className="mb-2">
              Comanda (Nome ou número) *
            </Label>
            <Input
              id="comanda"
              name="comanda"
              required
              placeholder="Ex: Rafael ou 12"
              className="border-app-border bg-white text-black text-lg py-3"
              value={comanda}
              onChange={(e) => setComanda(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="phone" className="mb-2">
              Telefone
            </Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="(00) 00000-0000"
              className="border-app-border bg-white text-black text-lg py-3"
              value={phone}
              onChange={handlePhoneChange}
              maxLength={15}
            />
          </div>

          <div className="border-t border-app-border pt-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xl font-normal">Total do Pedido</span>
              <span className="text-2xl font-normal text-brand-primary">
                {formatPrice(total)}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {cart.length} {cart.length === 1 ? "item" : "itens"} no pedido
            </p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {(!cart || cart.length === 0) && (
            <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-3">
              <p className="text-sm text-yellow-600">
                Carrinho vazio. Adicione produtos antes de finalizar o pedido.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-app-border hover:bg-transparent text-lg py-4"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !table || !comanda || !cart || cart.length === 0}
              className="flex-1 bg-brand-primary hover:bg-brand-primary/90 text-black tech-shadow tech-hover font-normal text-lg py-4"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin icon-3d" />
                  Processando...
                </>
              ) : (
                "Solicitar Pedido"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
