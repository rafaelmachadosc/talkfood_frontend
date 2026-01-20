/**
 * API Client refatorado usando Strategy Pattern e Factory Pattern
 * Mantém compatibilidade com código legado através do Adapter Pattern
 */

import { apiClient as newApiClient, getApiAdapter } from "@/core/http/api-adapter";
import { environmentConfig } from "@/core/config/environment-strategy";

// Re-exportar para compatibilidade
export { apiClient, getApiAdapter } from "@/core/http/api-adapter";

/**
 * @deprecated Use environmentConfig.getApiBaseUrl() diretamente
 * Mantido para compatibilidade com código legado
 */
export function getApiUrl(): string {
  return environmentConfig.getApiBaseUrl();
}

/**
 * Interface de compatibilidade mantida para facilitar migração
 * @deprecated Use HttpRequestOptions de @/core/http/http-client-factory
 */
export interface FetchOptions extends RequestInit {
  token?: string;
  cache?: "force-cache" | "no-store";
  next?: {
    revalidate?: false | 0 | number;
    tags?: string[];
  };
  silent404?: boolean;
}

/**
 * Função de compatibilidade que usa o novo sistema internamente
 * Mantém a mesma interface para não quebrar código existente
 * @deprecated Use getApiAdapter() diretamente para melhor performance e tipagem
 */
export async function apiClient<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  return newApiClient<T>(endpoint, options);
}
