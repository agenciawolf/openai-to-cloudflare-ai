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

// Request no formato OpenAI
export interface OpenAIRequest {
    model?: string;
    messages: OpenAIMessage[];
    tools?: OpenAITool[];
    tool_choice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } };
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
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
