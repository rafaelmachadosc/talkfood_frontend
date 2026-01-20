"use client";

import { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { X, Plus, Minus, ShoppingBag } from "lucide-react";
import { formatPrice } from "@/lib/format";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

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
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md bg-app-card border-app-border text-black overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl font-normal text-black tracking-tight">
            Comanda
          </SheetTitle>
          <SheetDescription className="text-gray-600">
            Revise seus itens antes de finalizar o pedido
          </SheetDescription>
        </SheetHeader>

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
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-normal text-black">
                          {item.product.name}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {formatPrice(item.product.price)} cada
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemove(item.product.id)}
                        className="h-8 w-8 text-gray-600 hover:text-black"
                      >
                        <X className="w-4 h-4 icon-3d" />
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
                          className="h-8 w-8 border-app-border"
                        >
                          <Minus className="w-4 h-4 icon-3d" />
                        </Button>
                        <span className="w-8 text-center font-normal">
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
                          className="h-8 w-8 border-app-border"
                        >
                          <Plus className="w-4 h-4 icon-3d" />
                        </Button>
                      </div>
                      <span className="font-normal text-brand-primary">
                        {formatPrice(item.product.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-app-border pt-4 mt-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-normal">Total</span>
                  <span className="text-2xl font-normal text-brand-primary">
                    {formatPrice(total)}
                  </span>
                </div>
                <Button
                  onClick={onCheckout}
                  className="w-full bg-brand-primary hover:bg-brand-primary/90 text-black tech-shadow tech-hover font-normal text-black font-normal"
                >
                  Finalizar Pedido
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
