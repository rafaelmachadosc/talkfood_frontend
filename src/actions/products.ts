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

    await api.post("/api/product", data, { token });

    revalidatePath("/dashboard/products");

    return { success: true, error: "" };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
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
