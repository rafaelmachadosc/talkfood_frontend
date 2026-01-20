"use server";

import { HttpClientFactory } from "@/core/http/http-client-factory";

const publicApi = HttpClientFactory.getPublicClient();

interface CreatePublicOrderData {
  orderType: "MESA" | "BALCAO";
  table?: number;
  name?: string;
  phone?: string;
  items: Array<{
    product_id: string;
    amount: number;
  }>;
}

export async function createPublicOrderAction(
  data: CreatePublicOrderData
): Promise<{ success: boolean; error?: string; orderId?: string }> {
  try {
    // Validar se há itens antes de criar o pedido
    if (!data.items || data.items.length === 0) {
      return {
        success: false,
        error: "É necessário adicionar pelo menos um item ao pedido. Verifique se o campo 'items' está sendo enviado corretamente.",
      };
    }

    // Validar cada item individualmente
    for (const item of data.items) {
      if (!item.product_id || !item.amount || item.amount <= 0) {
        return {
          success: false,
          error: `Item inválido: product_id e amount são obrigatórios. Recebido: ${JSON.stringify(item)}`,
        };
      }
    }

    // Criar o pedido COM os itens em uma única requisição
    const order = await publicApi.post<{ id: string }>("/api/public/order", {
      orderType: data.orderType,
      table: data.table,
      name: data.name,
      phone: data.phone,
      items: data.items, // Enviar items junto com a criação do pedido
    });

    // O pedido já foi criado com todos os itens e já está confirmado (draft: false)
    // Não precisa mais adicionar itens separadamente nem enviar o pedido

    return { success: true, orderId: order?.id };
  } catch (error) {
    console.error("Erro ao criar pedido público:", error);
    if (error instanceof Error) {
      const errorMessage = error.message;
      // Se o erro menciona items, fornecer mensagem mais clara
      if (errorMessage.toLowerCase().includes("item") || errorMessage.toLowerCase().includes("items")) {
        return {
          success: false,
          error: `${errorMessage}. Verifique se o campo 'items' está sendo enviado corretamente com ${data.items.length} item(s).`,
        };
      }
      return { success: false, error: errorMessage };
    }
    return { success: false, error: "Erro ao processar pedido" };
  }
}
