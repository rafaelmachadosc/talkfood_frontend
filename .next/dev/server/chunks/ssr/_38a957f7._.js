module.exports = [
"[project]/src/core/config/environment-strategy.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Strategy Pattern para gerenciar diferentes ambientes de conexão
 * Suporta: Local, Cloudflare Tunnel, e outros ambientes customizados
 */ __turbopack_context__.s([
    "CloudflareTunnelStrategy",
    ()=>CloudflareTunnelStrategy,
    "EnvironmentStrategyFactory",
    ()=>EnvironmentStrategyFactory,
    "EnvironmentType",
    ()=>EnvironmentType,
    "LocalEnvironmentStrategy",
    ()=>LocalEnvironmentStrategy,
    "ProductionEnvironmentStrategy",
    ()=>ProductionEnvironmentStrategy,
    "environmentConfig",
    ()=>environmentConfig
]);
var EnvironmentType = /*#__PURE__*/ function(EnvironmentType) {
    EnvironmentType["LOCAL"] = "local";
    EnvironmentType["CLOUDFLARE_TUNNEL"] = "cloudflare";
    EnvironmentType["PRODUCTION"] = "production";
    EnvironmentType["DEVELOPMENT"] = "development";
    return EnvironmentType;
}({});
class LocalEnvironmentStrategy {
    config;
    constructor(){
        this.config = {
            type: "local",
            frontendPort: 3000,
            backendPort: 8081,
            protocol: "http",
            hostname: "localhost",
            apiPath: "",
            baseUrl: "http://localhost:8081"
        };
    }
    getConfig() {
        return this.config;
    }
    getApiBaseUrl() {
        return this.config.baseUrl;
    }
    isSecure() {
        return false;
    }
}
class CloudflareTunnelStrategy {
    config;
    constructor(tunnelUrl){
        // Prioridade: parâmetro > variável de ambiente > domínio padrão
        let tunnelHost = tunnelUrl?.trim() || process.env.NEXT_PUBLIC_CLOUDFLARE_TUNNEL_URL?.trim() || "https://talkfoodsoftwerk.net";
        // Garantir que sempre temos uma URL válida (fallback de segurança)
        if (!tunnelHost || tunnelHost === "") {
            tunnelHost = "https://talkfoodsoftwerk.net";
        }
        this.config = {
            type: "cloudflare",
            frontendPort: 3000,
            backendPort: 8081,
            protocol: "https",
            hostname: this.extractHostname(tunnelHost),
            apiPath: "",
            baseUrl: tunnelHost
        };
    }
    extractHostname(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch  {
            return "localhost";
        }
    }
    getConfig() {
        return this.config;
    }
    getApiBaseUrl() {
        return this.config.baseUrl;
    }
    isSecure() {
        return true;
    }
}
class ProductionEnvironmentStrategy {
    config;
    constructor(productionUrl){
        const prodUrl = productionUrl || process.env.NEXT_PUBLIC_API_URL || "https://talkfoodsoftwerk.net";
        // Garantir que sempre temos uma URL válida
        const validUrl = prodUrl || "https://talkfoodsoftwerk.net";
        this.config = {
            type: "production",
            frontendPort: 443,
            backendPort: 443,
            protocol: "https",
            hostname: this.extractHostname(validUrl),
            apiPath: "",
            baseUrl: validUrl
        };
    }
    extractHostname(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch  {
            return "localhost";
        }
    }
    getConfig() {
        return this.config;
    }
    getApiBaseUrl() {
        return this.config.baseUrl;
    }
    isSecure() {
        return true;
    }
}
class EnvironmentStrategyFactory {
    static create() {
        const envType = process.env.NEXT_PUBLIC_ENVIRONMENT_TYPE || ("TURBOPACK compile-time value", "development") || "local";
        const isProduction = envType.toLowerCase() === "production" || ("TURBOPACK compile-time value", "development") === "production";
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
        switch(envType.toLowerCase()){
            case "cloudflare":
                return new CloudflareTunnelStrategy();
            case "production":
                return new CloudflareTunnelStrategy(); // Usa https://talkfoodsoftwerk.net
            case "local":
            case "development":
            default:
                return new LocalEnvironmentStrategy();
        }
    }
    static createFromType(type, customUrl) {
        switch(type){
            case "cloudflare":
                return new CloudflareTunnelStrategy(customUrl);
            case "production":
                return new ProductionEnvironmentStrategy(customUrl);
            case "local":
            case "development":
            default:
                return new LocalEnvironmentStrategy();
        }
    }
}
/**
 * Singleton para acesso global à configuração de ambiente
 */ class EnvironmentConfigManager {
    static instance;
    strategy;
    constructor(){
        try {
            this.strategy = EnvironmentStrategyFactory.create();
        } catch (error) {
            // Fallback para CloudflareTunnelStrategy em caso de erro
            console.error("Erro ao criar estratégia de ambiente, usando fallback:", error);
            this.strategy = new CloudflareTunnelStrategy();
        }
    }
    static getInstance() {
        if (!EnvironmentConfigManager.instance) {
            EnvironmentConfigManager.instance = new EnvironmentConfigManager();
        }
        return EnvironmentConfigManager.instance;
    }
    getStrategy() {
        return this.strategy;
    }
    setStrategy(strategy) {
        this.strategy = strategy;
    }
    getConfig() {
        try {
            return this.strategy.getConfig();
        } catch (error) {
            // Fallback seguro
            console.error("Erro ao obter configuração, usando fallback:", error);
            return new CloudflareTunnelStrategy().getConfig();
        }
    }
    getApiBaseUrl() {
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
const environmentConfig = EnvironmentConfigManager.getInstance();
}),
"[project]/src/core/http/http-client-factory.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Factory Pattern para criar diferentes tipos de clientes HTTP
 * Implementa DRY e Strategy Pattern para diferentes estratégias de requisição
 */ __turbopack_context__.s([
    "AuthenticatedHttpClient",
    ()=>AuthenticatedHttpClient,
    "HttpClientFactory",
    ()=>HttpClientFactory,
    "PublicHttpClient",
    ()=>PublicHttpClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$core$2f$config$2f$environment$2d$strategy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/core/config/environment-strategy.ts [app-rsc] (ecmascript)");
;
/**
 * Cliente HTTP base abstrato
 */ class BaseHttpClient {
    async request(endpoint, options = {}) {
        const url = this.buildUrl(endpoint);
        const headers = this.buildHeaders(options);
        return this.executeRequest(url, {
            ...options,
            headers
        });
    }
    async get(endpoint, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: "GET"
        });
    }
    async post(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: "POST",
            body: this.serializeBody(data)
        });
    }
    async put(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: "PUT",
            body: this.serializeBody(data)
        });
    }
    async delete(endpoint, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: "DELETE"
        });
    }
    serializeBody(data) {
        if (!data) return undefined;
        if (data instanceof FormData) return data;
        return JSON.stringify(data);
    }
    async executeRequest(url, options) {
        const { silent404, ...fetchOptions } = options;
        this.logRequest(url, fetchOptions);
        try {
            const response = await fetch(url, fetchOptions);
            if (!response.ok) {
                if (response.status === 404 && silent404) {
                    return null;
                }
                throw await this.createError(response);
            }
            return await this.parseResponse(response);
        } catch (error) {
            throw this.handleRequestError(error, url);
        }
    }
    async parseResponse(response) {
        const contentType = response.headers.get("content-type");
        const text = await response.text();
        if (!text || text.trim() === "") {
            return null;
        }
        if (contentType?.includes("application/json")) {
            try {
                return JSON.parse(text);
            } catch  {
                return null;
            }
        }
        try {
            return JSON.parse(text);
        } catch  {
            return null;
        }
    }
    async createError(response) {
        let errorMessage = `HTTP Error: ${response.status}`;
        try {
            const text = await response.text();
            if (text) {
                try {
                    const error = JSON.parse(text);
                    errorMessage = error.error || error.message || errorMessage;
                } catch  {
                    errorMessage = text || errorMessage;
                }
            }
        } catch  {
        // Usar mensagem padrão
        }
        return new Error(errorMessage);
    }
    handleRequestError(error, url) {
        if (error instanceof Error) {
            if (error.message.includes("fetch") || error.message.includes("ECONNREFUSED")) {
                const config = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$core$2f$config$2f$environment$2d$strategy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["environmentConfig"].getConfig();
                return new Error(`Não foi possível conectar ao servidor em ${config.baseUrl}. ` + `Verifique se o backend está rodando e acessível.`);
            }
            return error;
        }
        return new Error(`Erro desconhecido ao fazer requisição para ${url}`);
    }
    logRequest(url, options) {
        if ("TURBOPACK compile-time truthy", 1) {
            console.log(`[HTTP] ${options.method || "GET"} ${url}`);
        }
    }
}
class AuthenticatedHttpClient extends BaseHttpClient {
    buildUrl(endpoint) {
        const baseUrl = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$core$2f$config$2f$environment$2d$strategy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["environmentConfig"].getApiBaseUrl();
        const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
        const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
        return `${cleanBaseUrl}${cleanEndpoint}`;
    }
    buildHeaders(options) {
        const headers = {
            ...options.headers
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
class PublicHttpClient extends BaseHttpClient {
    buildUrl(endpoint) {
        const baseUrl = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$core$2f$config$2f$environment$2d$strategy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["environmentConfig"].getApiBaseUrl();
        const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
        const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
        return `${cleanBaseUrl}${cleanEndpoint}`;
    }
    buildHeaders(options) {
        const headers = {
            ...options.headers
        };
        if (!(options.body instanceof FormData)) {
            headers["Content-Type"] = "application/json";
        }
        return headers;
    }
}
class HttpClientFactory {
    static authenticatedClient;
    static publicClient;
    static getAuthenticatedClient() {
        if (!this.authenticatedClient) {
            this.authenticatedClient = new AuthenticatedHttpClient();
        }
        return this.authenticatedClient;
    }
    static getPublicClient() {
        if (!this.publicClient) {
            this.publicClient = new PublicHttpClient();
        }
        return this.publicClient;
    }
    static reset() {
        this.authenticatedClient = new AuthenticatedHttpClient();
        this.publicClient = new PublicHttpClient();
    }
}
}),
"[project]/src/core/http/api-adapter.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Adapter Pattern para compatibilidade com código legado
 * Mantém a interface antiga enquanto usa o novo sistema internamente
 */ __turbopack_context__.s([
    "ApiAdapter",
    ()=>ApiAdapter,
    "apiClient",
    ()=>apiClient,
    "getApiAdapter",
    ()=>getApiAdapter
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$core$2f$http$2f$http$2d$client$2d$factory$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/core/http/http-client-factory.ts [app-rsc] (ecmascript)");
;
class ApiAdapter {
    client;
    constructor(client){
        this.client = client || __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$core$2f$http$2f$http$2d$client$2d$factory$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["HttpClientFactory"].getAuthenticatedClient();
    }
    /**
   * Método principal que substitui o apiClient antigo
   * Mantém a mesma interface para facilitar migração
   */ async request(endpoint, options = {}) {
        const method = options.method || "GET";
        switch(method.toUpperCase()){
            case "GET":
                return this.client.get(endpoint, options);
            case "POST":
                return this.client.post(endpoint, this.parseBody(options.body), options);
            case "PUT":
                return this.client.put(endpoint, this.parseBody(options.body), options);
            case "DELETE":
                return this.client.delete(endpoint, options);
            default:
                return this.client.request(endpoint, options);
        }
    }
    parseBody(body) {
        if (typeof body === "string") {
            try {
                return JSON.parse(body);
            } catch  {
                return body;
            }
        }
        return body;
    }
    /**
   * Métodos auxiliares para facilitar uso
   */ async get(endpoint, options) {
        return this.client.get(endpoint, options);
    }
    async post(endpoint, data, options) {
        return this.client.post(endpoint, data, options);
    }
    async put(endpoint, data, options) {
        return this.client.put(endpoint, data, options);
    }
    async delete(endpoint, options) {
        return this.client.delete(endpoint, options);
    }
}
/**
 * Instância singleton do adapter
 */ let apiAdapterInstance = null;
function getApiAdapter() {
    if (!apiAdapterInstance) {
        apiAdapterInstance = new ApiAdapter();
    }
    return apiAdapterInstance;
}
async function apiClient(endpoint, options = {}) {
    const adapter = getApiAdapter();
    return adapter.request(endpoint, options);
}
}),
"[project]/src/lib/api.ts [app-rsc] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

/**
 * API Client refatorado usando Strategy Pattern e Factory Pattern
 * Mantém compatibilidade com código legado através do Adapter Pattern
 */ __turbopack_context__.s([
    "apiClient",
    ()=>apiClient,
    "getApiUrl",
    ()=>getApiUrl
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$core$2f$http$2f$api$2d$adapter$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/core/http/api-adapter.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$core$2f$config$2f$environment$2d$strategy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/core/config/environment-strategy.ts [app-rsc] (ecmascript)");
;
;
;
function getApiUrl() {
    return __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$core$2f$config$2f$environment$2d$strategy$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["environmentConfig"].getApiBaseUrl();
}
async function apiClient(endpoint, options = {}) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$core$2f$http$2f$api$2d$adapter$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["apiClient"])(endpoint, options);
}
}),
"[project]/src/lib/auth.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getToken",
    ()=>getToken,
    "getUser",
    ()=>getUser,
    "removeToken",
    ()=>removeToken,
    "requiredAdmin",
    ()=>requiredAdmin,
    "setToken",
    ()=>setToken
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/headers.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$api$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/api/navigation.react-server.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/components/navigation.react-server.js [app-rsc] (ecmascript)");
;
;
;
const COOKIE_NAME = "token_pizzaria";
/**
 * Normaliza o role do usuário (número ou string) para string uppercase
 * Suporta:
 * - Número: 1 = ADMIN, outros = STAFF
 * - String: "admin", "Admin", "ADMIN" → "ADMIN"
 * 
 * @param role - Role do usuário (número ou string)
 * @returns Role normalizado como string uppercase
 */ function normalizeRole(role) {
    // Se for número
    if (typeof role === "number") {
        return role === 1 ? "ADMIN" : "STAFF";
    }
    // Se for string, retornar em uppercase
    if (typeof role === "string") {
        return role.toUpperCase();
    }
    // Fallback seguro (nunca deve chegar aqui, mas garante que não quebra)
    return "STAFF";
}
async function getToken() {
    const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cookies"])();
    return cookieStore.get(COOKIE_NAME)?.value;
}
async function setToken(token) {
    const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cookies"])();
    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
        sameSite: true,
        secure: ("TURBOPACK compile-time value", "development") === "production"
    });
}
async function removeToken() {
    const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cookies"])();
    cookieStore.delete(COOKIE_NAME);
}
async function getUser() {
    try {
        const token = await getToken();
        if (!token) {
            return null;
        }
        const user = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["apiClient"])("/api/auth/me", {
            token: token
        });
        return user;
    } catch (err) {
        // console.log(err);
        return null;
    }
}
async function requiredAdmin() {
    const user = await getUser();
    if (!user) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])("/login");
    }
    // Normalizar role para garantir compatibilidade com número ou string
    const normalizedRole = normalizeRole(user.role);
    if (normalizedRole !== "ADMIN") {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])("/access-denied");
    }
    return user;
}
}),
"[project]/src/actions/auth.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"00634a52b33e8e4fd4662a654eff5c87e6da0b935c":"logoutAction","605276655e3b4341b8ee01edb1d04b281cf3b17a67":"registerAction","60d33d8ed334dbd5a58748aad245d58c63a538d922":"loginAction"},"",""] */ __turbopack_context__.s([
    "loginAction",
    ()=>loginAction,
    "logoutAction",
    ()=>logoutAction,
    "registerAction",
    ()=>registerAction
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/auth.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$api$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/api/navigation.react-server.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/components/navigation.react-server.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
;
async function registerAction(prevState, formData) {
    try {
        const name = formData.get("name");
        const email = formData.get("email");
        const password = formData.get("password");
        const data = {
            name: name,
            email: email,
            password: password
        };
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["apiClient"])("/api/auth/users", {
            method: "POST",
            body: JSON.stringify(data)
        });
        return {
            success: true,
            error: "",
            redirectTo: "/login"
        };
    } catch (error) {
        if (error instanceof Error) {
            return {
                success: false,
                error: error.message
            };
        }
        return {
            success: false,
            error: "Erro ao criar conta"
        };
    }
}
async function loginAction(prevState, formData) {
    try {
        const email = formData.get("email");
        const password = formData.get("password");
        const data = {
            email: email,
            password: password
        };
        const response = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["apiClient"])("/api/auth/session", {
            method: "POST",
            body: JSON.stringify(data)
        });
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["setToken"])(response.token);
        return {
            success: true,
            error: "",
            redirectTo: "/dashboard"
        };
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
                error: errorMessage
            };
        }
        return {
            success: false,
            error: "Erro ao fazer o login. Tente novamente."
        };
    }
}
async function logoutAction() {
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["removeToken"])();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])("/login");
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    registerAction,
    loginAction,
    logoutAction
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(registerAction, "605276655e3b4341b8ee01edb1d04b281cf3b17a67", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(loginAction, "60d33d8ed334dbd5a58748aad245d58c63a538d922", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(logoutAction, "00634a52b33e8e4fd4662a654eff5c87e6da0b935c", null);
}),
"[project]/.next-internal/server/app/login/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/actions/auth.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$actions$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/actions/auth.ts [app-rsc] (ecmascript)");
;
}),
"[project]/.next-internal/server/app/login/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/actions/auth.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "60d33d8ed334dbd5a58748aad245d58c63a538d922",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$actions$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["loginAction"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$login$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$actions$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/login/page/actions.js { ACTIONS_MODULE0 => "[project]/src/actions/auth.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$actions$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/actions/auth.ts [app-rsc] (ecmascript)");
}),
];

//# sourceMappingURL=_38a957f7._.js.map