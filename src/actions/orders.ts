"use server";

import { getApiAdapter } from "@/core/http/api-adapter";
import { getToken } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const api = getApiAdapter();

export async function createOrderAction(data: {
  orderType: "MESA" | "BALCAO";
  table?: number;
  name?: string;
  phone?: string;
}) {
  try {
    const token = await getToken();

    if (!token) {
      return { success: false, error: "Erro ao criar pedido" };
    }

    // Construir payload limpo, removendo campos undefined
    const payload: Record<string, unknown> = {
      orderType: data.orderType,
      items: [], // Array vazio para satisfazer validação do backend
    };

    // Adicionar campos específicos baseado no tipo de pedido
    if (data.orderType === "MESA") {
      // Para MESA, table é obrigatório
      if (data.table === undefined || data.table === null) {
        return { success: false, error: "Número da mesa é obrigatório" };
      }
      payload.table = Number(data.table); // Garantir que é número
    } else if (data.orderType === "BALCAO") {
      // Para BALCÃO, name é obrigatório
      if (!data.name || data.name.trim() === "") {
        return { success: false, error: "Nome do cliente é obrigatório" };
      }
      payload.name = data.name.trim();
      // phone é opcional
      if (data.phone && data.phone.trim() !== "") {
        payload.phone = data.phone.trim();
      }
    }

    // Log do payload em desenvolvimento para debug
    if (process.env.NODE_ENV === "development") {
      console.log("[createOrderAction] Payload:", JSON.stringify(payload, null, 2));
    }

    await api.post("/api/order", payload, { token });

    revalidatePath("/dashboard");

    return { success: true, error: "" };
  } catch (error) {
    console.error("[createOrderAction] Erro ao criar pedido:", error);
    
    if (error instanceof Error) {
      // Melhorar mensagem de erro para 400
      let errorMessage = error.message;
      if (errorMessage.includes("400") || errorMessage.includes("Bad Request")) {
        errorMessage = `Erro ao criar pedido: ${errorMessage}. Verifique se todos os campos obrigatórios foram preenchidos corretamente.`;
      }
      return { success: false, error: errorMessage };
    }

    return { success: false, error: "Erro ao criar pedido" };
  }
}

export async function markOrderAsViewedAction(orderId: string) {
  try {
    const token = await getToken();

    if (!token) {
      return { success: false, error: "Erro ao marcar pedido como visualizado" };
    }

    await api.put("/api/order/viewed", { order_id: orderId }, { token });

    revalidatePath("/dashboard");

    return { success: true, error: "" };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "Erro ao marcar pedido como visualizado" };
  }
}

export async function finishOrderAction(orderId: string) {
  if (!orderId) {
    return { success: false, error: "Falha ao finalizar o pedido" };
  }

  try {
    const token = await getToken();

    if (!token) {
      return { success: false, error: "Falha ao finalizar o pedido" };
    }

    const data = {
      order_id: orderId,
    };

    await api.put("/api/order/finish", data, { token });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/caixa");
    revalidatePath("/dashboard/kitchen");

    return { success: true, error: "" };
  } catch (err) {
    console.error("Erro ao finalizar pedido:", err);
    
    let errorMessage = "Falha ao finalizar o pedido";
    if (err instanceof Error) {
      errorMessage = err.message || errorMessage;
      // Melhorar mensagens de erro específicas
      if (errorMessage.includes("404")) {
        errorMessage = "Pedido não encontrado. Ele pode ter sido removido.";
      } else if (errorMessage.includes("400")) {
        errorMessage = "Erro ao processar a finalização do pedido.";
      } else if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
        errorMessage = "Sessão expirada. Faça login novamente.";
      }
    }
    
    return { success: false, error: errorMessage };
  }
}

export async function receiveOrderAction(
  orderId: string,
  paymentMethod?: string,
  receivedAmount?: number
) {
  if (!orderId) {
    return { success: false, error: "Falha ao receber o pedido" };
  }

  try {
    const token = await getToken();

    if (!token) {
      return { success: false, error: "Falha ao receber o pedido" };
    }

    // Primeiro, buscar o pedido para obter o valor total e verificar status
    const order = await api.get<{ 
      status?: boolean;
      items?: Array<{ product: { price: number }; amount: number }> 
    }>(`/api/order/detail?order_id=${orderId}`, { token });

    // Verificar se o pedido já está finalizado
    if (!order) {
      return { success: false, error: "Pedido não encontrado" };
    }

    if (order.status) {
      return { success: false, error: "Este pedido já foi finalizado e recebido" };
    }

    // Calcular o total do pedido
    const total = order.items?.reduce((sum, item) => sum + item.product.price * item.amount, 0) || 0;

    // Registrar o recebimento no caixa (endpoint que precisa ser implementado no backend)
    // Por enquanto, vamos apenas finalizar o pedido e atualizar o caixa
    try {
      await api.post("/api/caixa/receive", {
        order_id: orderId,
        amount: total,
        payment_method: paymentMethod || "DINHEIRO",
        received_amount: receivedAmount ? Math.round(receivedAmount * 100) : undefined, // Converter para centavos
      }, { 
        token,
        silent404: true, // Não gerar erro se endpoint não existir ainda
      });
    } catch (err) {
      // Se o endpoint não existir, continuar mesmo assim
      console.log("Endpoint /caixa/receive não disponível ainda");
    }

    // Finalizar o pedido
    try {
      await api.put("/api/order/finish", { order_id: orderId }, { token });
    } catch (finishErr) {
      console.error("Erro ao finalizar pedido:", finishErr);
      let errorMessage = "Erro ao finalizar o pedido";
      if (finishErr instanceof Error) {
        errorMessage = finishErr.message || errorMessage;
        if (errorMessage.includes("404")) {
          errorMessage = "Pedido não encontrado. Ele pode ter sido removido.";
        } else if (errorMessage.includes("400")) {
          errorMessage = "Erro ao processar a finalização do pedido.";
        }
      }
      return { success: false, error: errorMessage };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/caixa");
    revalidatePath("/dashboard/analytics");
    revalidatePath("/dashboard/kitchen");

    return { success: true, error: "" };
  } catch (err) {
    console.error("Erro ao receber pedido:", err);
    
    let errorMessage = "Falha ao receber o pedido";
    if (err instanceof Error) {
      errorMessage = err.message || errorMessage;
      // Melhorar mensagens de erro específicas
      if (errorMessage.includes("404")) {
        errorMessage = "Pedido não encontrado. Ele pode ter sido removido.";
      } else if (errorMessage.includes("400")) {
        errorMessage = "Erro ao processar o recebimento do pedido.";
      } else if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
        errorMessage = "Sessão expirada. Faça login novamente.";
      }
    }
    
    return { success: false, error: errorMessage };
  }
}
