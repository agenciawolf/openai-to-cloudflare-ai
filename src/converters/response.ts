/**
 * Converter: Cloudflare Response → OpenAI Response
 */

import { OpenAIResponse, OpenAIToolCall, CloudflareResponse } from '../types';
import { generateCompletionId, generateToolCallId } from '../utils/crypto';

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
 * Fallback message quando resposta está vazia
 */
const EMPTY_RESPONSE_FALLBACK = 'Desculpe, não consegui processar sua solicitação.';

/**
 * Cria response no formato OpenAI completo
 */
export function createOpenAIResponse(
    cfResponse: CloudflareResponse,
    model: string
): OpenAIResponse {
    const toolCalls = convertToolCalls(cfResponse.tool_calls);
    const hasToolCalls = !!toolCalls && toolCalls.length > 0;

    // Garantir que content nunca seja vazio quando não há tool_calls
    let content: string | null = cfResponse.response ?? null;
    if (!hasToolCalls && (!content || content.trim().length === 0)) {
        content = EMPTY_RESPONSE_FALLBACK;
    }

    return {
        id: generateCompletionId(),
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
