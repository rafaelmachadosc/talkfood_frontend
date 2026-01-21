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
      return { success: false, error: "Falha ao deletar produto" };
    }

    const token = await getToken();

    if (!token) {
      return { success: false, error: "Falha ao deletar produto" };
    }

    await api.delete(`/api/product?product_id=${productId}`, { token });

    revalidatePath("/dashboard/products");
    return { success: true, error: "" };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "Erro ao deletar o produto" };
  }
}
