/**
 * Service: Cloudflare AI
 * 
 * Responsável por chamar o modelo de IA com:
 * - Retry automático em caso de falha
 * - Fallback para modelo secundário
 * - Validação de resposta
 * - Timeout handling
 */

import { Env, CloudflareMessage, CloudflareTool, CloudflareResponse } from '../types';
import { MODEL, FALLBACK_MODEL, AI_CONFIG } from '../config';
import { log, logError, logWarn } from '../utils';

/**
 * Opções para chamada de IA
 */
export interface AICallOptions {
    messages: CloudflareMessage[];
    tools?: CloudflareTool[];
}

/**
 * Resultado interno da chamada de IA
 */
interface AICallResult {
    response: CloudflareResponse;
    modelUsed: string;
    retryCount: number;
}

/**
 * Valida se a resposta da IA é válida
 * Uma resposta válida deve ter response OU tool_calls
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
    options: { messages: CloudflareMessage[]; tools?: CloudflareTool[] }
): Promise<CloudflareResponse> {
    log(`CALLING MODEL: ${model}`, { messagesCount: options.messages.length, hasTools: !!options.tools });

    const response = await env.AI.run(model, options);

    log(`MODEL RESPONSE: ${model}`, response);

    return response;
}

/**
 * Chama o modelo Cloudflare AI com retry e fallback
 * 
 * Estratégia:
 * 1. Tenta modelo principal
 * 2. Se falhar ou resposta inválida, retry até maxRetries
 * 3. Se ainda falhar, tenta modelo de fallback
 * 4. Se tudo falhar, retorna resposta de erro amigável (nunca throw)
 */
export async function callAI(
    env: Env,
    options: AICallOptions
): Promise<CloudflareResponse> {
    const runOptions = {
        messages: options.messages,
        ...(options.tools?.length && { tools: options.tools })
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

            // Delay antes de retry (exceto última tentativa)
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

    // Tentar modelo de fallback
    log('ATTEMPTING FALLBACK MODEL', { model: FALLBACK_MODEL });

    try {
        // Fallback: remover tools (modelos menores podem não suportar bem)
        const fallbackOptions = {
            messages: options.messages,
            // Não passar tools para fallback - forçar resposta de texto
        };

        const fallbackResponse = await tryModel(env, FALLBACK_MODEL, fallbackOptions);

        if (isValidResponse(fallbackResponse)) {
            logWarn('FALLBACK SUCCESS', { model: FALLBACK_MODEL });
            return fallbackResponse;
        }
    } catch (error) {
        logError('FALLBACK ERROR', error);
    }

    // Último recurso: retornar resposta de erro amigável
    // NUNCA deixar o usuário sem resposta
    logError('ALL MODELS FAILED', { primaryModel: MODEL, fallbackModel: FALLBACK_MODEL });

    return {
        response: 'Desculpe, estou com dificuldades técnicas no momento. Por favor, tente novamente em alguns instantes.',
        tool_calls: undefined
    };
}
