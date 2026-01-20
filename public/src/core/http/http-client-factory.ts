/**
 * Factory Pattern para criar diferentes tipos de clientes HTTP
 * Implementa DRY e Strategy Pattern para diferentes estratégias de requisição
 */

import { environmentConfig } from "../config/environment-strategy";

export interface IHttpClient {
  request<T>(endpoint: string, options?: HttpRequestOptions): Promise<T>;
  get<T>(endpoint: string, options?: HttpRequestOptions): Promise<T>;
  post<T>(endpoint: string, data?: unknown, options?: HttpRequestOptions): Promise<T>;
  put<T>(endpoint: string, data?: unknown, options?: HttpRequestOptions): Promise<T>;
  delete<T>(endpoint: string, options?: HttpRequestOptions): Promise<T>;
}

export interface HttpRequestOptions extends RequestInit {
  token?: string;
  silent404?: boolean;
  skipAuth?: boolean;
}

/**
 * Cliente HTTP base abstrato
 */
abstract class BaseHttpClient implements IHttpClient {
  protected abstract buildUrl(endpoint: string): string;
  protected abstract buildHeaders(options: HttpRequestOptions): HeadersInit;

  async request<T>(endpoint: string, options: HttpRequestOptions = {}): Promise<T> {
    const url = this.buildUrl(endpoint);
    const headers = this.buildHeaders(options);

    return this.executeRequest<T>(url, { ...options, headers });
  }

  async get<T>(endpoint: string, options: HttpRequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  async post<T>(endpoint: string, data?: unknown, options: HttpRequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: this.serializeBody(data),
    });
  }

  async put<T>(endpoint: string, data?: unknown, options: HttpRequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: this.serializeBody(data),
    });
  }

  async delete<T>(endpoint: string, options: HttpRequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }

  protected serializeBody(data: unknown): string | FormData | undefined {
    if (!data) return undefined;
    if (data instanceof FormData) return data;
    return JSON.stringify(data);
  }

  protected async executeRequest<T>(
    url: string,
    options: HttpRequestOptions & { headers: HeadersInit }
  ): Promise<T> {
    const { silent404, ...fetchOptions } = options;

    this.logRequest(url, fetchOptions);

    try {
      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        if (response.status === 404 && silent404) {
          return null as T;
        }
        throw await this.createError(response);
      }

      return await this.parseResponse<T>(response);
    } catch (error) {
      throw this.handleRequestError(error, url);
    }
  }

  protected async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get("content-type");
    const text = await response.text();

    if (!text || text.trim() === "") {
      return null as T;
    }

    if (contentType?.includes("application/json")) {
      try {
        return JSON.parse(text) as T;
      } catch {
        return null as T;
      }
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      return null as T;
    }
  }

  protected async createError(response: Response): Promise<Error> {
    let errorMessage = `HTTP Error: ${response.status}`;

    try {
      const text = await response.text();
      if (text) {
        try {
          const error = JSON.parse(text);
          errorMessage = error.error || error.message || errorMessage;
        } catch {
          errorMessage = text || errorMessage;
        }
      }
    } catch {
      // Usar mensagem padrão
    }

    return new Error(errorMessage);
  }

  protected handleRequestError(error: unknown, url: string): Error {
    if (error instanceof Error) {
      if (error.message.includes("fetch") || error.message.includes("ECONNREFUSED")) {
        const config = environmentConfig.getConfig();
        return new Error(
          `Não foi possível conectar ao servidor em ${config.baseUrl}. ` +
          `Verifique se o backend está rodando e acessível.`
        );
      }
      return error;
    }

    return new Error(`Erro desconhecido ao fazer requisição para ${url}`);
  }

  protected logRequest(url: string, options: RequestInit): void {
    if (process.env.NODE_ENV === "development") {
      console.log(`[HTTP] ${options.method || "GET"} ${url}`);
    }
  }
}

/**
 * Cliente HTTP padrão com autenticação
 */
export class AuthenticatedHttpClient extends BaseHttpClient {
  protected buildUrl(endpoint: string): string {
    const baseUrl = environmentConfig.getApiBaseUrl();
    const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    return `${cleanBaseUrl}${cleanEndpoint}`;
  }

  protected buildHeaders(options: HttpRequestOptions): HeadersInit {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (options.token && !options.skipAuth) {
      headers["Authorization"] = `Bearer ${options.token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    return headers;
  }
}

/**
 * Cliente HTTP público (sem autenticação)
 */
export class PublicHttpClient extends BaseHttpClient {
  protected buildUrl(endpoint: string): string {
    const baseUrl = environmentConfig.getApiBaseUrl();
    const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    return `${cleanBaseUrl}${cleanEndpoint}`;
  }

  protected buildHeaders(options: HttpRequestOptions): HeadersInit {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    return headers;
  }
}

/**
 * Factory para criar clientes HTTP
 */
export class HttpClientFactory {
  private static authenticatedClient: IHttpClient;
  private static publicClient: IHttpClient;

  static getAuthenticatedClient(): IHttpClient {
    if (!this.authenticatedClient) {
      this.authenticatedClient = new AuthenticatedHttpClient();
    }
    return this.authenticatedClient;
  }

  static getPublicClient(): IHttpClient {
    if (!this.publicClient) {
      this.publicClient = new PublicHttpClient();
    }
    return this.publicClient;
  }

  static reset(): void {
    this.authenticatedClient = new AuthenticatedHttpClient();
    this.publicClient = new PublicHttpClient();
  }
}
