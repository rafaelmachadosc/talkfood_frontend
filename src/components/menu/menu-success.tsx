"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Receipt } from "lucide-react";
import { useRouter } from "next/navigation";

interface MenuSuccessProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string;
  table?: number;
  phone?: string;
}

export function MenuSuccess({ isOpen, onClose, orderId, table, phone }: MenuSuccessProps) {
  const router = useRouter();

  const handleViewComanda = () => {
    if (table && phone) {
      const normalizedPhone = phone.replace(/\D/g, "");
      router.push(`/comanda?table=${table}&phone=${normalizedPhone}`);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-app-card border-app-border text-black max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="w-16 h-16 text-green-500 icon-3d" />
          </div>
          <DialogTitle className="text-2xl font-normal text-center text-black tracking-tight">
            Pedido Confirmado!
          </DialogTitle>
          <DialogDescription className="text-gray-600 text-center mt-2">
            Seu pedido foi enviado para a cozinha e será preparado em breve.
          </DialogDescription>
        </DialogHeader>

        {orderId && (
          <div className="mt-4 p-4 bg-white rounded-lg border border-app-border tech-shadow">
            <p className="text-sm text-gray-600">ID do Pedido:</p>
            <p className="text-sm font-mono text-black mt-1">{orderId}</p>
          </div>
        )}

        <div className="flex flex-col gap-3 mt-6">
          {table && phone && (
            <Button
              onClick={handleViewComanda}
              className="w-full bg-brand-primary hover:bg-brand-primary/90 text-black tech-shadow tech-hover font-normal"
            >
              <Receipt className="w-4 h-4 mr-2 icon-3d" />
              Ver Minha Comanda
            </Button>
          )}
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full border-app-border hover:bg-transparent tech-shadow tech-hover font-normal"
          >
            Fazer Novo Pedido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
