"use server";

import { getApiAdapter } from "@/core/http/api-adapter";
import { getToken } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const api = getApiAdapter();

export async function createProductAction(data: {
  name: string;
  description: string;
  price: string;
  category_id: string;
}) {
  try {
    const token = await getToken();

    if (!token) {
      return { success: false, error: "Erro ao criar produto" };
    }

    // Validar se category_id foi fornecido
    if (!data.category_id || data.category_id.trim() === "") {
      return { success: false, error: "Categoria é obrigatória" };
    }

    // Log do payload em desenvolvimento para debug
    if (process.env.NODE_ENV === "development") {
      console.log("[createProductAction] Payload:", JSON.stringify(data, null, 2));
    }

    await api.post("/api/product", data, { token });

    revalidatePath("/dashboard/products");

    return { success: true, error: "" };
  } catch (error) {
    console.error("[createProductAction] Erro ao criar produto:", error);
    
    if (error instanceof Error) {
      let errorMessage = error.message;
      
      // Melhorar mensagens de erro específicas
      if (errorMessage.includes("Categoria não encontrada") || errorMessage.includes("category")) {
        errorMessage = "Categoria não encontrada. Verifique se a categoria existe e tente novamente.";
      } else if (errorMessage.includes("400") || errorMessage.includes("Bad Request")) {
        errorMessage = `Erro ao criar produto: ${errorMessage}. Verifique se todos os campos foram preenchidos corretamente.`;
      }
      
      return { success: false, error: errorMessage };
    }

    return { success: false, error: "Erro ao criar produto" };
  }
}

export async function updateProductAction(data: {
  product_id: string;
  name: string;
  description: string;
  price: string;
  category_id: string;
}) {
  try {
    const token = await getToken();

    if (!token) {
      return { success: false, error: "Erro ao atualizar produto" };
    }

    await api.put("/api/product", data, { token });

    revalidatePath("/dashboard/products");

    return { success: true, error: "" };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "Erro ao atualizar produto" };
  }
}

export async function deleteProductAction(productId: string) {
  try {
    if (!productId) {
      return { success: false, error: "Falha ao deletar produto: ID não fornecido" };
    }

    const token = await getToken();

    if (!token) {
      return { success: false, error: "Falha ao deletar produto: Token de autenticação não encontrado" };
    }

    // Tentar diferentes formatos de endpoint DELETE (dependendo do backend)
    try {
      // Formato 1: Query parameter (atual)
      await api.delete(`/api/product?product_id=${productId}`, { token });
    } catch (error1) {
      // Se falhar com 405, tentar formato alternativo
      if (error1 instanceof Error && error1.message.includes("405")) {
        try {
          // Formato 2: No path
          await api.delete(`/api/product/${productId}`, { token });
        } catch (error2) {
          // Formato 3: No body
          await api.delete(`/api/product`, { 
            token,
            body: JSON.stringify({ product_id: productId })
          });
        }
      } else {
        throw error1;
      }
    }

    revalidatePath("/dashboard/products");
    return { success: true, error: "" };
  } catch (error) {
    if (error instanceof Error) {
      const errorMessage = error.message;
      if (errorMessage.includes("405")) {
        return { success: false, error: "Erro: Método DELETE não permitido. Verifique a implementação do endpoint no backend." };
      }
      return { success: false, error: errorMessage };
    }

    return { success: false, error: "Erro ao deletar o produto" };
  }
}
