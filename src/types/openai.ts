/**
 * Tipos para formato OpenAI (o que n8n/clientes enviam)
 * Baseado em: https://platform.openai.com/docs/api-reference/chat
 */

// Mensagem no formato OpenAI
export interface OpenAIMessage {
    role: 'system' | 'developer' | 'user' | 'assistant' | 'tool';
    content: string | null;
    tool_calls?: OpenAIToolCall[];
    tool_call_id?: string;
    name?: string;
}

// Definição de tool no formato OpenAI
export interface OpenAITool {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
    };
}

// Tool call no formato OpenAI (resposta)
export interface OpenAIToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string; // JSON string
    };
}

/**
 * Parâmetros de geração de texto
 * Mapeamento OpenAI → Cloudflare Workers AI
 */
export interface GenerationParams {
    temperature?: number;     // 0-5 (Cloudflare) vs 0-2 (OpenAI)
    top_p?: number;           // 0.001-1
    top_k?: number;           // 1-50 (Cloudflare only)
    max_tokens?: number;      // default 256
    frequency_penalty?: number; // -2 to 2
    presence_penalty?: number;  // -2 to 2
    repetition_penalty?: number; // 0-2 (Cloudflare only)
    seed?: number;            // 1-9999999999
}

// Request no formato OpenAI
export interface OpenAIRequest extends GenerationParams {
    model?: string;
    messages: OpenAIMessage[];
    tools?: OpenAITool[];
    tool_choice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } };
    stream?: boolean;
    // n8n specific (ignorados)
    reasoning_effort?: string;
}

// Choice na resposta OpenAI
export interface OpenAIChoice {
    index: number;
    message: {
        role: 'assistant';
        content: string | null;
        tool_calls?: OpenAIToolCall[];
    };
    finish_reason: 'stop' | 'tool_calls' | 'length' | 'content_filter';
}

// Response no formato OpenAI
export interface OpenAIResponse {
    id: string;
    object: 'chat.completion';
    created: number;
    model: string;
    choices: OpenAIChoice[];
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

// Error no formato OpenAI
export interface OpenAIError {
    error: {
        message: string;
        type: 'invalid_request_error' | 'authentication_error' | 'api_error' | 'rate_limit_error';
        code?: string;
    };
}
