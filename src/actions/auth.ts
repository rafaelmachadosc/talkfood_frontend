"use server";

import { apiClient } from "@/lib/api";
import { removeToken, setToken } from "@/lib/auth";
import { AuthResponse, User } from "@/lib/types";
import { redirect } from "next/navigation";

export async function registerAction(
  prevState: { success: boolean; error: string; redirectTo?: string } | null,
  formData: FormData
) {
  try {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const data = {
      name: name,
      email: email,
      password: password,
    };

    await apiClient<User>("/api/auth/users", {
      method: "POST",
      body: JSON.stringify(data),
    });

    return { success: true, error: "", redirectTo: "/login" };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "Erro ao criar conta" };
  }
}

export async function loginAction(
  prevState: { success: boolean; error: string; redirectTo?: string } | null,
  formData: FormData
) {
  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const data = {
      email: email,
      password: password,
    };

    const response = await apiClient<AuthResponse>("/api/auth/session", {
      method: "POST",
      body: JSON.stringify(data),
    });

    await setToken(response.token);

    return { success: true, error: "", redirectTo: "/dashboard" };
  } catch (error) {
    console.error("Erro no login:", error);

    if (error instanceof Error) {
      // Mensagens de erro mais amigáveis
      let errorMessage = error.message;
      
      if (errorMessage.includes("ECONNREFUSED") || errorMessage.includes("fetch failed")) {
        errorMessage = "Não foi possível conectar ao servidor. Verifique se o backend está rodando na porta 3333.";
      } else if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
        errorMessage = "Email ou senha incorretos.";
      } else if (errorMessage.includes("404")) {
        errorMessage = "Serviço não encontrado. Verifique a URL da API.";
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }

    return { success: false, error: "Erro ao fazer o login. Tente novamente." };
  }
}

export async function logoutAction() {
  await removeToken();
  redirect("/login");
}
