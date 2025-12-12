/**
 * Converter: Cloudflare Response → OpenAI Response
 */

import { OpenAIResponse, OpenAIToolCall, CloudflareResponse } from '../types';

/**
 * Gera ID único para chat completion
 */
function generateId(): string {
    return 'chatcmpl-' + Math.random().toString(36).substring(2, 15);
}

/**
 * Gera ID único para tool call
 */
function generateToolCallId(): string {
    return 'call_' + Math.random().toString(36).substring(2, 15);
}

/**
 * Converte tool_calls Cloudflare → OpenAI
 */
export function convertToolCalls(cfToolCalls: CloudflareResponse['tool_calls']): OpenAIToolCall[] | undefined {
    if (!cfToolCalls || cfToolCalls.length === 0) {
        return undefined;
    }

    return cfToolCalls.map(tc => ({
        id: generateToolCallId(),
        type: 'function' as const,
        function: {
            name: tc.name,
            arguments: typeof tc.arguments === 'string'
                ? tc.arguments
                : JSON.stringify(tc.arguments)
        }
    }));
}

/**
 * Cria response no formato OpenAI completo
 */
export function createOpenAIResponse(
    cfResponse: CloudflareResponse,
    model: string
): OpenAIResponse {
    const toolCalls = convertToolCalls(cfResponse.tool_calls);
    const hasToolCalls = toolCalls && toolCalls.length > 0;

    // Garantir que content nunca seja vazio quando não há tool_calls
    let content: string | null = cfResponse.response || null;
    if (!hasToolCalls && (!content || content.trim().length === 0)) {
        content = 'Desculpe, não consegui processar sua solicitação.';
    }

    return {
        id: generateId(),
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [
            {
                index: 0,
                message: {
                    role: 'assistant',
                    content: hasToolCalls ? null : content,
                    ...(hasToolCalls && { tool_calls: toolCalls })
                },
                finish_reason: hasToolCalls ? 'tool_calls' : 'stop'
            }
        ],
        usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0
        }
    };
}
