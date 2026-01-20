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
    const tunnelHost = tunnelUrl || 
                      process.env.NEXT_PUBLIC_CLOUDFLARE_TUNNEL_URL || 
                      "https://talkfoodsoftwerk.net";
    
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
    const prodUrl = productionUrl || process.env.NEXT_PUBLIC_API_URL || "";
    
    this.config = {
      type: EnvironmentType.PRODUCTION,
      frontendPort: 443,
      backendPort: 443,
      protocol: "https",
      hostname: this.extractHostname(prodUrl),
      apiPath: "",
      baseUrl: prodUrl,
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

    // Verificar se há URL do Cloudflare Tunnel ou se o domínio padrão está configurado
    const tunnelUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_TUNNEL_URL;
    const useTunnel = tunnelUrl || 
                     envType.toLowerCase() === EnvironmentType.CLOUDFLARE_TUNNEL ||
                     envType.toLowerCase() === "production"; // Produção geralmente usa tunnel

    if (useTunnel) {
      return new CloudflareTunnelStrategy(tunnelUrl);
    }

    // Verificar tipo de ambiente explícito
    switch (envType.toLowerCase()) {
      case EnvironmentType.CLOUDFLARE_TUNNEL:
        return new CloudflareTunnelStrategy();
      case EnvironmentType.PRODUCTION:
        return new ProductionEnvironmentStrategy();
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
    this.strategy = EnvironmentStrategyFactory.create();
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
    return this.strategy.getConfig();
  }

  getApiBaseUrl(): string {
    return this.strategy.getApiBaseUrl();
  }
}

export const environmentConfig = EnvironmentConfigManager.getInstance();
