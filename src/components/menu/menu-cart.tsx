"use client";

import { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { X, Plus, Minus, ShoppingBag } from "lucide-react";
import { formatPrice } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CartItem {
  product: Product;
  quantity: number;
}

interface MenuCartProps {
  cart: CartItem[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onCheckout: () => void;
  total: number;
}

export function MenuCart({
  cart,
  isOpen,
  onClose,
  onUpdateQuantity,
  onRemove,
  onCheckout,
  total,
}: MenuCartProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full sm:max-w-lg bg-app-card border-app-border text-black overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl sm:text-4xl font-normal text-black tracking-tight">
            Comanda
          </DialogTitle>
          <DialogDescription className="text-gray-600 text-lg">
            Revise seus itens antes de solicitar o pedido
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-16 h-16 mx-auto text-gray-500 mb-4 icon-3d" />
              <p className="text-gray-600">Seu carrinho está vazio</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="bg-app-background rounded-lg p-4 border border-app-border"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-normal text-black text-xl">
                          {item.product.name}
                        </h3>
                        <p className="text-lg text-gray-600 mt-2">
                          {formatPrice(item.product.price)} cada
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemove(item.product.id)}
                        className="h-10 w-10 text-gray-600 hover:text-black"
                      >
                        <X className="w-5 h-5 icon-3d" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            onUpdateQuantity(
                              item.product.id,
                              item.quantity - 1
                            )
                          }
                          className="h-11 w-11 border-app-border"
                        >
                          <Minus className="w-5 h-5 icon-3d" />
                        </Button>
                        <span className="w-10 text-center font-normal text-lg">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            onUpdateQuantity(
                              item.product.id,
                              item.quantity + 1
                            )
                          }
                          className="h-11 w-11 border-app-border"
                        >
                          <Plus className="w-5 h-5 icon-3d" />
                        </Button>
                      </div>
                      <span className="font-normal text-brand-primary text-xl">
                        {formatPrice(item.product.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-app-border pt-4 mt-6">
                <div className="flex justify-between items-center mb-5">
                  <span className="text-xl font-normal">Total</span>
                  <span className="text-3xl font-normal text-brand-primary">
                    {formatPrice(total)}
                  </span>
                </div>
                <Button
                  onClick={onCheckout}
                  className="w-full bg-brand-primary hover:bg-brand-primary/90 text-black tech-shadow tech-hover font-normal text-xl py-4"
                >
                  Solicitar Pedido
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
