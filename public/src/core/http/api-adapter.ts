/**
 * Adapter Pattern para compatibilidade com código legado
 * Mantém a interface antiga enquanto usa o novo sistema internamente
 */

import { HttpClientFactory, HttpRequestOptions } from "./http-client-factory";
import { IHttpClient } from "./http-client-factory";

/**
 * Adapter que mantém compatibilidade com a API antiga
 * Implementa DRY ao centralizar toda lógica de requisição
 */
export class ApiAdapter {
  private client: IHttpClient;

  constructor(client?: IHttpClient) {
    this.client = client || HttpClientFactory.getAuthenticatedClient();
  }

  /**
   * Método principal que substitui o apiClient antigo
   * Mantém a mesma interface para facilitar migração
   */
  async request<T>(endpoint: string, options: HttpRequestOptions = {}): Promise<T> {
    const method = options.method || "GET";

    switch (method.toUpperCase()) {
      case "GET":
        return this.client.get<T>(endpoint, options);
      case "POST":
        return this.client.post<T>(endpoint, this.parseBody(options.body), options);
      case "PUT":
        return this.client.put<T>(endpoint, this.parseBody(options.body), options);
      case "DELETE":
        return this.client.delete<T>(endpoint, options);
      default:
        return this.client.request<T>(endpoint, options);
    }
  }

  private parseBody(body: unknown): unknown {
    if (typeof body === "string") {
      try {
        return JSON.parse(body);
      } catch {
        return body;
      }
    }
    return body;
  }

  /**
   * Métodos auxiliares para facilitar uso
   */
  async get<T>(endpoint: string, options?: HttpRequestOptions): Promise<T> {
    return this.client.get<T>(endpoint, options);
  }

  async post<T>(endpoint: string, data?: unknown, options?: HttpRequestOptions): Promise<T> {
    return this.client.post<T>(endpoint, data, options);
  }

  async put<T>(endpoint: string, data?: unknown, options?: HttpRequestOptions): Promise<T> {
    return this.client.put<T>(endpoint, data, options);
  }

  async delete<T>(endpoint: string, options?: HttpRequestOptions): Promise<T> {
    return this.client.delete<T>(endpoint, options);
  }
}

/**
 * Instância singleton do adapter
 */
let apiAdapterInstance: ApiAdapter | null = null;

export function getApiAdapter(): ApiAdapter {
  if (!apiAdapterInstance) {
    apiAdapterInstance = new ApiAdapter();
  }
  return apiAdapterInstance;
}

/**
 * Função de compatibilidade que mantém a interface antiga
 * @deprecated Use getApiAdapter() diretamente para melhor tipagem
 */
export async function apiClient<T>(
  endpoint: string,
  options: HttpRequestOptions = {}
): Promise<T> {
  const adapter = getApiAdapter();
  return adapter.request<T>(endpoint, options);
}
