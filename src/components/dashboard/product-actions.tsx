"use client";
import { useState } from "react";
import { EditButtonProduct } from "./edit-button";
import { DeleteButtonProduct } from "./delete-button";
import { EditProductForm } from "./edit-product-form";
import { Product } from "@/lib/types";

interface ProductActionsProps {
  product: Product;
}

export function ProductActions({ product }: ProductActionsProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        <EditButtonProduct
          productId={product.id}
          onEdit={() => setIsEditOpen(true)}
        />
        <DeleteButtonProduct productId={product.id} />
      </div>

      <EditProductForm
        product={product}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
      />
    </>
  );
}
