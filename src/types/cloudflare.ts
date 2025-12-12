/**
 * Tipos para formato Cloudflare Workers AI
 * Baseado em: https://developers.cloudflare.com/workers-ai/
 */

// Mensagem no formato Cloudflare
export interface CloudflareMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    name?: string; // Usado para identificar tool responses
}

// Tool no formato Cloudflare (mais simples que OpenAI)
export interface CloudflareTool {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
}

// Tool call retornado pela Cloudflare
export interface CloudflareToolCall {
    name: string;
    arguments: Record<string, unknown>;
}

// Response da Cloudflare AI
export interface CloudflareResponse {
    response?: string;
    tool_calls?: CloudflareToolCall[];
}

/**
 * Parâmetros de geração suportados pela Cloudflare AI
 * Documentação: https://developers.cloudflare.com/workers-ai/models/hermes-2-pro-mistral-7b/
 */
export interface CloudflareGenerationParams {
    temperature?: number;       // default 0.6, min 0, max 5
    top_p?: number;             // min 0.001, max 1
    top_k?: number;             // min 1, max 50
    max_tokens?: number;        // default 256
    frequency_penalty?: number; // min -2, max 2
    presence_penalty?: number;  // min -2, max 2
    repetition_penalty?: number; // min 0, max 2
    seed?: number;              // min 1, max 9999999999
}

// Environment bindings
export interface Env {
    AI: {
        run: (model: string, options: CloudflareAIOptions) => Promise<CloudflareResponse>;
    };
    API_TOKEN?: string; // Secret para autenticação
}

// Opções para AI.run (combinação de messages + tools + params)
export interface CloudflareAIOptions extends CloudflareGenerationParams {
    messages: CloudflareMessage[];
    tools?: CloudflareTool[];
}
