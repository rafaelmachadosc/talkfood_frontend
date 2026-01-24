"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createOrderAction } from "@/actions/orders";
import { useRouter } from "next/navigation";
import { orderEventHelpers } from "@/lib/order-events";

interface OrderFormProps {
  triggerLabel?: string;
  defaultType?: "MESA" | "BALCAO";
}

export function OrderForm({ triggerLabel = "Novo pedido", defaultType = "MESA" }: OrderFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [orderType, setOrderType] = useState<"MESA" | "BALCAO">(defaultType);
  const [table, setTable] = useState("");
  const [name, setName] = useState("");
  const [comanda, setComanda] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleCreateOrder(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const result = await createOrderAction({
      orderType,
      table: orderType === "MESA" ? Number(table) : undefined,
      name: orderType === "BALCAO" ? name : undefined,
      phone: undefined,
      comanda: orderType === "MESA" ? comanda : undefined,
    });

    setIsLoading(false);

    if (result.success) {
      setOpen(false);
      setOrderType("MESA");
      setTable("");
      setName("");
      setComanda("");
      
      // Notificar componentes sobre novo pedido criado
      if (orderType === "MESA") {
        orderEventHelpers.notifyTableOpened();
      } else {
        orderEventHelpers.notifyOrderCreated();
      }
      
      router.refresh();
      return;
    } else {
      console.log(result.error);
      alert(result.error);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setOrderType(defaultType);
          if (defaultType === "MESA") {
            setName("");
          } else {
            setTable("");
            setComanda("");
          }
        }
      }}
    >
      <DialogTrigger asChild>
        <Button className="bg-brand-primary hover:bg-brand-primary/90 text-black tech-shadow tech-hover font-normal">
          <Plus className="h-5 w-5 mr-2 icon-3d" />
          {triggerLabel}
        </Button>
      </DialogTrigger>

      <DialogContent className="p-6 bg-app-card text-black max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="tracking-tight">Criar novo pedido</DialogTitle>
          <DialogDescription>Crie um novo pedido de balcão ou mesa</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleCreateOrder}>
          <div>
            <Label htmlFor="orderType" className="mb-2">
              Tipo de pedido
            </Label>
            <Select
              value={orderType}
              onValueChange={(value: "MESA" | "BALCAO") => {
                setOrderType(value);
                if (value === "BALCAO") {
                  setTable("");
                } else {
                  setName("");
                }
              }}
              required
            >
              <SelectTrigger className="border-app-border bg-app-background text-black">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent className="bg-app-card border-app-border">
                <SelectItem
                  value="MESA"
                  className="text-black hover:bg-transparent cursor-pointer"
                >
                  Pedido na Mesa
                </SelectItem>
                <SelectItem
                  value="BALCAO"
                  className="text-black hover:bg-transparent cursor-pointer"
                >
                  Pedido no Balcão
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {orderType === "MESA" && (
            <div>
              <Label htmlFor="table" className="mb-2">
                Número da mesa *
              </Label>
              <Select
                value={table}
                onValueChange={setTable}
                required={orderType === "MESA"}
              >
                <SelectTrigger className="border-app-border bg-app-background text-black">
                  <SelectValue placeholder="Selecione a mesa" />
                </SelectTrigger>
                <SelectContent className="bg-app-card border-app-border max-h-[200px] overflow-y-auto">
                  {Array.from({ length: 20 }, (_, i) => i + 1).map((tableNumber) => (
                    <SelectItem
                      key={tableNumber}
                      value={tableNumber.toString()}
                      className="text-black hover:bg-transparent cursor-pointer"
                    >
                      Mesa {tableNumber.toString().padStart(2, "0")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Selecione os itens após criar o pedido
              </p>
            </div>
          )}

        {orderType === "MESA" && (
          <div>
            <Label htmlFor="comanda" className="mb-2">
              Comanda
            </Label>
            <Input
              id="comanda"
              name="comanda"
              placeholder="Digite o número da comanda..."
              className="border-app-border bg-white text-black"
              value={comanda}
              onChange={(e) => setComanda(e.target.value)}
              required={orderType === "MESA"}
            />
          </div>
        )}

          {orderType === "BALCAO" && (
            <div>
              <Label htmlFor="name" className="mb-2">
                Nome do cliente *
              </Label>
              <Input
                id="name"
                name="name"
                required={orderType === "BALCAO"}
                placeholder="Digite o nome do cliente..."
                className="border-app-border bg-white text-black"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Selecione os itens após criar o pedido
              </p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading || (orderType === "MESA" && !table) || (orderType === "BALCAO" && !name)}
            className="w-full bg-brand-primary text-black hover:bg-brand-primary disabled:opacity-50"
          >
            {isLoading ? "Criando..." : "Criar pedido"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
