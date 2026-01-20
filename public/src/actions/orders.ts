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

    await api.post("/order", data, { token });

    revalidatePath("/dashboard");

    return { success: true, error: "" };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
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

    await api.put("/order/viewed", { order_id: orderId }, { token });

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

    await api.put("/order/finish", data, { token });

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
    }>(`/order/detail?order_id=${orderId}`, { token });

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
      await api.post("/caixa/receive", {
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
      await api.put("/order/finish", { order_id: orderId }, { token });
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
