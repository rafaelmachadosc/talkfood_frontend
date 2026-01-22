"use client";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateProductAction } from "@/actions/products";
import { useRouter } from "next/navigation";
import { Category, Product } from "@/lib/types";

interface EditProductFormProps {
  product: Product;
  categories: Category[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProductForm({
  product,
  categories,
  open,
  onOpenChange,
}: EditProductFormProps) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [priceValue, setPriceValue] = useState("");

  useEffect(() => {
    if (product) {
      // Garantir que category_id seja string e esteja definido
      const categoryId = String(product.category_id || "").trim();
      setSelectedCategory(categoryId);
      
      // Converter centavos para formato BRL
      const priceInReais = product.price / 100;
      setPriceValue(
        priceInReais.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })
      );
    }
  }, [product, open]); // Adicionar 'open' como dependência para resetar quando o modal abrir

  function convertBRLToCents(value: string): number {
    const cleanValue = value
      .replace(/[R$\s]/g, "")
      .replace(/\./g, "")
      .replace(",", ".");

    const reais = parseFloat(cleanValue) || 0;

    return Math.round(reais * 100);
  }

  async function handleUpdateProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formElement = e.currentTarget;

    const name = (formElement.elements.namedItem("name") as HTMLInputElement)
      ?.value;
    const description = (
      formElement.elements.namedItem("description") as HTMLInputElement
    )?.value;
    const priceInCents = convertBRLToCents(priceValue);

    const result = await updateProductAction({
      product_id: product.id,
      name,
      description,
      price: priceInCents.toString(),
      category_id: selectedCategory,
    });

    setIsLoading(false);

    if (result.success) {
      onOpenChange(false);
      router.refresh();
      return;
    } else {
      console.log(result.error);
      alert(result.error);
    }
  }

  function formatToBrl(value: string) {
    const numbers = value.replace(/\D/g, "");

    if (!numbers) return "";

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-6 bg-app-card text-black max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="tracking-tight">Editar produto</DialogTitle>
          <DialogDescription>Editando produto...</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleUpdateProduct}>
          <div>
            <Label htmlFor="edit-name" className="mb-2">
              Nome do produto
            </Label>
            <Input
              id="edit-name"
              name="name"
              required
              defaultValue={product.name}
              placeholder="Digite o nome do produto..."
              className="border-app-border bg-white text-black"
            />
          </div>

          <div>
            <Label htmlFor="edit-price" className="mb-2">
              Preço
            </Label>
            <Input
              id="edit-price"
              name="price"
              required
              placeholder="Ex: 35,00"
              className="border-app-border bg-white text-black"
              value={priceValue}
              onChange={handlePriceChange}
            />
          </div>

          <div>
            <Label htmlFor="edit-description" className="mb-2">
              Descrição
            </Label>
            <Textarea
              id="edit-description"
              name="description"
              required
              defaultValue={product.description}
              placeholder="Digite a descrição do produto..."
              className="border-app-border bg-app-background text-black min-h-[100px]"
            />
          </div>

          <div>
            <Label htmlFor="edit-category" className="mb-2">
              Categoria
            </Label>
            <Select
              value={selectedCategory || ""}
              onValueChange={(value) => setSelectedCategory(value)}
              required
            >
              <SelectTrigger className="border-app-border bg-app-background text-black">
                <SelectValue placeholder="Selecione uma categoria">
                  {selectedCategory 
                    ? categories.find(c => String(c.id).trim() === String(selectedCategory).trim())?.name 
                    : "Selecione uma categoria"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-app-card border-app-border">
                {categories.map((category) => {
                  const categoryId = String(category.id).trim();
                  return (
                    <SelectItem
                      key={category.id}
                      value={categoryId}
                      className="text-black hover:bg-transparent cursor-pointer"
                    >
                      {category.name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            disabled={isLoading || !selectedCategory}
            className="w-full bg-brand-primary text-black hover:bg-brand-primary disabled:opacity-50"
          >
            {isLoading ? "Salvando..." : "Salvar alterações"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
