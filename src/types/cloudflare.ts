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

// Environment bindings
export interface Env {
    AI: {
        run: (model: string, options: CloudflareAIOptions) => Promise<CloudflareResponse>;
    };
    API_TOKEN?: string; // Secret para autenticação
}

// Opções para AI.run
export interface CloudflareAIOptions {
    messages: CloudflareMessage[];
    tools?: CloudflareTool[];
}
