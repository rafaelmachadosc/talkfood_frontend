import { apiClient } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { Product } from "@/lib/types";
import { Package } from "lucide-react";
import { ProductForm } from "@/components/dashboard/product-form";
import { ProductActions } from "@/components/dashboard/product-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function Products() {
  const token = await getToken();

  // Buscar produtos
  let products: Product[] = [];
  try {
    products = await apiClient<Product[]>("/api/products", {
      token: token!,
    }) || [];
    
  } catch (error) {
    console.error("Erro ao buscar produtos:", error);
    products = [];
  }

  // Função para formatar o preço
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price / 100);
  };

  const sortedProducts = [...products].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-normal text-black">
            Produtos
          </h1>
          <p className="text-sm sm:text-base mt-1">Gerencie seus produtos</p>
        </div>

        <ProductForm />
      </div>

      {products.length !== 0 && (
        <div className="bg-app-card border border-app-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-app-border hover:bg-transparent bg-app-background/50">
                <TableHead className="text-black w-12"></TableHead>
                <TableHead className="text-black font-normal w-[200px]">Nome</TableHead>
                <TableHead className="text-black font-normal w-[150px]">Categoria</TableHead>
                <TableHead className="text-black font-normal">Descrição</TableHead>
                <TableHead className="text-black font-normal text-right w-[120px]">Preço</TableHead>
                <TableHead className="text-black font-normal text-right w-32">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProducts.map((product) => {
                const categoryName = product.category || "Sem categoria";

                return (
                  <TableRow
                    key={product.id}
                    className="border-app-border hover:bg-app-background/30 transition-colors"
                  >
                    <TableCell className="py-3 w-12">
                      <Package className="w-4 h-4 text-gray-600 icon-3d" />
                    </TableCell>
                    <TableCell className="text-black font-normal py-3 w-[200px]">
                      {product.name}
                    </TableCell>
                    <TableCell className="text-gray-600 text-sm py-3 w-[150px]">
                      <span className="inline-block px-2 py-1 bg-gray-100 rounded text-xs">
                        {categoryName}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-700 text-sm py-3 max-w-md truncate">
                      {product.description}
                    </TableCell>
                    <TableCell className="text-right py-3 w-[120px]">
                      <span className="text-brand-primary font-normal">
                        {formatPrice(product.price)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right py-3 w-32">
                      <ProductActions product={product} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {products.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 mx-auto text-gray-500 mb-4" />
          <p className="text-gray-600 text-lg">Nenhum produto cadastrado</p>
          <p className="text-gray-500 text-sm mt-2">
            Comece adicionando seu primeiro produto
          </p>
        </div>
      )}

    </div>
  );
}
