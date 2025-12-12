/**
 * Service: Cloudflare AI
 * 
 * Responsável por chamar o modelo de IA com:
 * - Retry automático em caso de falha
 * - Fallback para modelo secundário
 * - Validação de resposta
 * - Suporte a parâmetros de geração (temperature, top_p, etc)
 */

import { Env, CloudflareMessage, CloudflareTool, CloudflareResponse, CloudflareGenerationParams } from '../types';
import { MODEL, FALLBACK_MODEL, AI_CONFIG } from '../config';
import { log, logError, logWarn } from '../utils';

/**
 * Opções para chamada de IA
 */
export interface AICallOptions {
    messages: CloudflareMessage[];
    tools?: CloudflareTool[];
    params?: CloudflareGenerationParams;
}

/**
 * Valida se a resposta da IA é válida
 */
function isValidResponse(response: CloudflareResponse): boolean {
    const hasResponse = !!response.response && response.response.trim().length > 0;
    const hasToolCalls = !!response.tool_calls && response.tool_calls.length > 0;
    return hasResponse || hasToolCalls;
}

/**
 * Delay helper para retry
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Tenta chamar um modelo específico
 */
async function tryModel(
    env: Env,
    model: string,
    options: {
        messages: CloudflareMessage[];
        tools?: CloudflareTool[];
    } & CloudflareGenerationParams
): Promise<CloudflareResponse> {
    log(`CALLING MODEL: ${model}`, {
        messagesCount: options.messages.length,
        hasTools: !!options.tools,
        params: { temperature: options.temperature, top_p: options.top_p, max_tokens: options.max_tokens }
    });

    const response = await env.AI.run(model, options);

    log(`MODEL RESPONSE: ${model}`, response);

    return response;
}

/**
 * Chama o modelo Cloudflare AI com retry e fallback
 */
export async function callAI(
    env: Env,
    options: AICallOptions
): Promise<CloudflareResponse> {
    // Construir opções com mensagens, tools e parâmetros de geração
    const runOptions = {
        messages: options.messages,
        ...(options.tools?.length && { tools: options.tools }),
        ...(options.params && options.params),
    };

    log('AI.RUN OPTIONS', { model: MODEL, ...runOptions });

    // Tentar modelo principal com retry
    for (let attempt = 0; attempt <= AI_CONFIG.maxRetries; attempt++) {
        try {
            const response = await tryModel(env, MODEL, runOptions);

            if (isValidResponse(response)) {
                log('AI SUCCESS', { model: MODEL, attempt });
                return response;
            }

            logWarn('INVALID RESPONSE', { model: MODEL, attempt, response });

            if (attempt < AI_CONFIG.maxRetries) {
                await delay(AI_CONFIG.retryDelayMs);
            }
        } catch (error) {
            logError(`AI ERROR (attempt ${attempt})`, error);

            if (attempt < AI_CONFIG.maxRetries) {
                await delay(AI_CONFIG.retryDelayMs);
            }
        }
    }

    // Tentar modelo de fallback (sem tools e com params básicos)
    log('ATTEMPTING FALLBACK MODEL', { model: FALLBACK_MODEL });

    try {
        const fallbackOptions = {
            messages: options.messages,
            // Preservar apenas params básicos para fallback
            ...(options.params?.temperature !== undefined && { temperature: options.params.temperature }),
            ...(options.params?.max_tokens !== undefined && { max_tokens: options.params.max_tokens }),
        };

        const fallbackResponse = await tryModel(env, FALLBACK_MODEL, fallbackOptions);

        if (isValidResponse(fallbackResponse)) {
            logWarn('FALLBACK SUCCESS', { model: FALLBACK_MODEL });
            return fallbackResponse;
        }
    } catch (error) {
        logError('FALLBACK ERROR', error);
    }

    // Último recurso: resposta de erro amigável
    logError('ALL MODELS FAILED', { primaryModel: MODEL, fallbackModel: FALLBACK_MODEL });

    return {
        response: 'Desculpe, estou com dificuldades técnicas no momento. Por favor, tente novamente em alguns instantes.',
        tool_calls: undefined
    };
}
