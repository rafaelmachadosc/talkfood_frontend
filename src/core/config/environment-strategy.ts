/**
 * Strategy Pattern para gerenciar diferentes ambientes de conexão
 * Suporta: Local, Cloudflare Tunnel, e outros ambientes customizados
 */

export enum EnvironmentType {
  LOCAL = "local",
  CLOUDFLARE_TUNNEL = "cloudflare",
  PRODUCTION = "production",
  DEVELOPMENT = "development",
}

export interface EnvironmentConfig {
  readonly type: EnvironmentType;
  readonly frontendPort: number;
  readonly backendPort: number;
  readonly baseUrl: string;
  readonly protocol: "http" | "https";
  readonly hostname: string;
  readonly apiPath: string;
}

/**
 * Strategy Interface para diferentes configurações de ambiente
 */
export interface IEnvironmentStrategy {
  getConfig(): EnvironmentConfig;
  getApiBaseUrl(): string;
  isSecure(): boolean;
}

/**
 * Strategy para ambiente Local
 */
export class LocalEnvironmentStrategy implements IEnvironmentStrategy {
  private readonly config: EnvironmentConfig;

  constructor() {
    this.config = {
      type: EnvironmentType.LOCAL,
      frontendPort: 3000,
      backendPort: 8081,
      protocol: "http",
      hostname: "localhost",
      apiPath: "",
      baseUrl: "http://localhost:8081",
    };
  }

  getConfig(): EnvironmentConfig {
    return this.config;
  }

  getApiBaseUrl(): string {
    return this.config.baseUrl;
  }

  isSecure(): boolean {
    return false;
  }
}

/**
 * Strategy para Cloudflare Tunnel
 */
export class CloudflareTunnelStrategy implements IEnvironmentStrategy {
  private readonly config: EnvironmentConfig;

  constructor(tunnelUrl?: string) {
    // Prioridade: parâmetro > variável de ambiente > domínio padrão
    let tunnelHost = tunnelUrl?.trim() || 
                     process.env.NEXT_PUBLIC_CLOUDFLARE_TUNNEL_URL?.trim() || 
                     "https://talkfoodsoftwerk.net";
    
    // Garantir que sempre temos uma URL válida (fallback de segurança)
    if (!tunnelHost || tunnelHost === "") {
      tunnelHost = "https://talkfoodsoftwerk.net";
    }
    
    this.config = {
      type: EnvironmentType.CLOUDFLARE_TUNNEL,
      frontendPort: 3000,
      backendPort: 8081,
      protocol: "https",
      hostname: this.extractHostname(tunnelHost),
      apiPath: "",
      baseUrl: tunnelHost,
    };
  }

  private extractHostname(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return "localhost";
    }
  }

  getConfig(): EnvironmentConfig {
    return this.config;
  }

  getApiBaseUrl(): string {
    return this.config.baseUrl;
  }

  isSecure(): boolean {
    return true;
  }
}

/**
 * Strategy para ambiente de Produção
 */
export class ProductionEnvironmentStrategy implements IEnvironmentStrategy {
  private readonly config: EnvironmentConfig;

  constructor(productionUrl?: string) {
    const prodUrl = productionUrl || process.env.NEXT_PUBLIC_API_URL || "https://talkfoodsoftwerk.net";
    
    // Garantir que sempre temos uma URL válida
    const validUrl = prodUrl || "https://talkfoodsoftwerk.net";
    
    this.config = {
      type: EnvironmentType.PRODUCTION,
      frontendPort: 443,
      backendPort: 443,
      protocol: "https",
      hostname: this.extractHostname(validUrl),
      apiPath: "",
      baseUrl: validUrl,
    };
  }

  private extractHostname(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return "localhost";
    }
  }

  getConfig(): EnvironmentConfig {
    return this.config;
  }

  getApiBaseUrl(): string {
    return this.config.baseUrl;
  }

  isSecure(): boolean {
    return true;
  }
}

/**
 * Factory para criar a estratégia de ambiente apropriada
 */
export class EnvironmentStrategyFactory {
  static create(): IEnvironmentStrategy {
    const envType = process.env.NEXT_PUBLIC_ENVIRONMENT_TYPE || 
                   process.env.NODE_ENV || 
                   "local";

    const isProduction = envType.toLowerCase() === "production" || 
                        process.env.NODE_ENV === "production";

    // Prioridade 1: Se NEXT_PUBLIC_API_URL está configurado, usar ProductionStrategy
    const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
    if (apiUrl && apiUrl !== "") {
      // Se começa com https, usar ProductionStrategy
      if (apiUrl.startsWith("https://")) {
        return new ProductionEnvironmentStrategy(apiUrl);
      }
      // Se começa com http, também usar ProductionStrategy (pode ser desenvolvimento)
      if (apiUrl.startsWith("http://")) {
        return new ProductionEnvironmentStrategy(apiUrl);
      }
    }

    // Prioridade 2: Verificar se há URL do Cloudflare Tunnel
    const tunnelUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_TUNNEL_URL?.trim();
    if (tunnelUrl && tunnelUrl !== "") {
      return new CloudflareTunnelStrategy(tunnelUrl);
    }

    // Prioridade 3: Se estiver em produção, usar Cloudflare Tunnel Strategy com URL padrão
    if (isProduction) {
      return new CloudflareTunnelStrategy(); // Usa https://talkfoodsoftwerk.net como padrão
    }

    // Prioridade 4: Verificar tipo de ambiente explícito
    switch (envType.toLowerCase()) {
      case EnvironmentType.CLOUDFLARE_TUNNEL:
        return new CloudflareTunnelStrategy();
      case EnvironmentType.PRODUCTION:
        return new CloudflareTunnelStrategy(); // Usa https://talkfoodsoftwerk.net
      case EnvironmentType.LOCAL:
      case EnvironmentType.DEVELOPMENT:
      default:
        return new LocalEnvironmentStrategy();
    }
  }

  static createFromType(type: EnvironmentType, customUrl?: string): IEnvironmentStrategy {
    switch (type) {
      case EnvironmentType.CLOUDFLARE_TUNNEL:
        return new CloudflareTunnelStrategy(customUrl);
      case EnvironmentType.PRODUCTION:
        return new ProductionEnvironmentStrategy(customUrl);
      case EnvironmentType.LOCAL:
      case EnvironmentType.DEVELOPMENT:
      default:
        return new LocalEnvironmentStrategy();
    }
  }
}

/**
 * Singleton para acesso global à configuração de ambiente
 */
class EnvironmentConfigManager {
  private static instance: EnvironmentConfigManager;
  private strategy: IEnvironmentStrategy;

  private constructor() {
    try {
      this.strategy = EnvironmentStrategyFactory.create();
    } catch (error) {
      // Fallback para CloudflareTunnelStrategy em caso de erro
      console.error("Erro ao criar estratégia de ambiente, usando fallback:", error);
      this.strategy = new CloudflareTunnelStrategy();
    }
  }

  static getInstance(): EnvironmentConfigManager {
    if (!EnvironmentConfigManager.instance) {
      EnvironmentConfigManager.instance = new EnvironmentConfigManager();
    }
    return EnvironmentConfigManager.instance;
  }

  getStrategy(): IEnvironmentStrategy {
    return this.strategy;
  }

  setStrategy(strategy: IEnvironmentStrategy): void {
    this.strategy = strategy;
  }

  getConfig(): EnvironmentConfig {
    try {
      return this.strategy.getConfig();
    } catch (error) {
      // Fallback seguro
      console.error("Erro ao obter configuração, usando fallback:", error);
      return new CloudflareTunnelStrategy().getConfig();
    }
  }

  getApiBaseUrl(): string {
    try {
      const url = this.strategy.getApiBaseUrl();
      // Garantir que sempre retorna uma URL válida
      if (!url || url.trim() === "") {
        return "https://talkfoodsoftwerk.net";
      }
      return url;
    } catch (error) {
      // Fallback seguro
      console.error("Erro ao obter URL da API, usando fallback:", error);
      return "https://talkfoodsoftwerk.net";
    }
  }
}

// Inicialização segura do singleton
export const environmentConfig = EnvironmentConfigManager.getInstance();
