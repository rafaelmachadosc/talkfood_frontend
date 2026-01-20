"use client";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";

interface EditButtonProps {
  productId: string;
  onEdit: (productId: string) => void;
}

export function EditButtonProduct({ productId, onEdit }: EditButtonProps) {
  return (
    <Button
      onClick={() => onEdit(productId)}
      variant="outline"
      size="sm"
      className="h-8 w-8 p-0 border-app-border text-black hover:bg-app-background"
    >
      <Edit className="w-4 h-4 icon-3d" />
    </Button>
  );
}
