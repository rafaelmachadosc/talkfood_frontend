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
import { Textarea } from "@/components/ui/textarea";
import { createProductAction } from "@/actions/products";
import { useRouter } from "next/navigation";

interface ProductFormProps {
}

export function ProductForm(_: ProductFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [categoryValue, setCategoryValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [priceValue, setPriceValue] = useState("");

  function convertBRLToCents(value: string): number {
    const cleanValue = value
      .replace(/[R$\s]/g, "")
      .replace(/\./g, "")
      .replace(",", ".");

    const reais = parseFloat(cleanValue) || 0;

    return Math.round(reais * 100);
  }

  async function handleCreateProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formElement = e.currentTarget;

    const name = (formElement.elements.namedItem("name") as HTMLInputElement)
      ?.value;
    const description = (
      formElement.elements.namedItem("description") as HTMLInputElement
    )?.value;
    const priceInCents = convertBRLToCents(priceValue);

    // Validar se categoria foi selecionada
    if (!categoryValue || categoryValue.trim() === "") {
      setIsLoading(false);
      alert("Por favor, selecione uma categoria.");
      return;
    }

    const result = await createProductAction({
      name,
      description,
      price: priceInCents.toString(),
      category: categoryValue,
    });

    setIsLoading(false);

    if (result.success) {
      setOpen(false);
      setCategoryValue("");
      setPriceValue("");
      router.refresh();
      return;
    } else {
      console.error("Erro ao criar produto:", result.error);
      // Melhorar mensagem de erro
      let errorMsg = result.error || "Erro ao criar produto";
      if (errorMsg.includes("Categoria não encontrada") || errorMsg.includes("category")) {
        errorMsg = "Categoria não encontrada. Por favor, verifique se a categoria existe e tente novamente.";
      }
      alert(errorMsg);
    }
  }

  function formatToBrl(value: string) {
    // REMOVER TUDO QUE NÃO é numero
    const numbers = value.replace(/\D/g, "");

    if (!numbers) return "";

    // Converter para numero e dividir po 100 para ter os centavos
    const amount = parseInt(numbers) / 100;

    return amount.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function handlePriceChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatToBrl(e.target.value);
    setPriceValue(formatted);
  }


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-brand-primary hover:bg-brand-primary/90 text-black tech-shadow tech-hover font-normal">
          <Plus className="h-5 w-5 mr-2 icon-3d" />
          Novo produto
        </Button>
      </DialogTrigger>

      <DialogContent className="p-6 bg-app-card text-black max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="tracking-tight">Criar novo produto</DialogTitle>
          <DialogDescription>Criando novo produto...</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleCreateProduct}>
          <div>
            <Label htmlFor="name" className="mb-2">
              Nome do produto
            </Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="Digite o nome do produto..."
              className="border-app-border bg-white text-black"
            />
          </div>

          <div>
            <Label htmlFor="price" className="mb-2">
              Preço
            </Label>
            <Input
              id="price"
              name="price"
              required
              placeholder="Ex: 35,00"
              className="border-app-border bg-white text-black"
              value={priceValue}
              onChange={handlePriceChange}
            />
          </div>

          <div>
            <Label htmlFor="description" className="mb-2">
              Descrição
            </Label>
            <Textarea
              id="description"
              name="description"
              required
              placeholder="Digite a descrição do produto..."
              className="border-app-border bg-app-background text-black min-h-[100px]"
            />
          </div>

          <div>
            <Label htmlFor="category" className="mb-2">
              Categoria
            </Label>
            <Input
              id="category"
              name="category"
              required
              placeholder="Digite a categoria..."
              className="border-app-border bg-app-background text-black"
              value={categoryValue}
              onChange={(e) => setCategoryValue(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading || !categoryValue}
            className="w-full bg-brand-primary text-black hover:bg-brand-primary disabled:opacity-50"
          >
            {isLoading ? "Criando..." : "Criar produto"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
