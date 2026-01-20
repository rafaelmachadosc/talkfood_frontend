/**
 * Helper para requisições públicas (sem autenticação)
 * Aplica DRY e usa o novo sistema de HTTP Client
 */

import { HttpClientFactory } from "./http-client-factory";

const publicClient = HttpClientFactory.getPublicClient();

/**
 * Helper para fazer requisições GET públicas
 */
export async function fetchPublic<T>(endpoint: string): Promise<T> {
  return publicClient.get<T>(endpoint, { cache: "no-store" });
}

/**
 * Helper para fazer requisições POST públicas
 */
export async function postPublic<T>(endpoint: string, data?: unknown): Promise<T> {
  return publicClient.post<T>(endpoint, data);
}

/**
 * Helper para fazer múltiplas requisições públicas em paralelo
 */
export async function fetchPublicAll<T extends unknown[]>(
  endpoints: string[]
): Promise<T> {
  const promises = endpoints.map((endpoint) => fetchPublic<T[number]>(endpoint));
  return Promise.all(promises) as Promise<T>;
}
