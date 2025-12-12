/**
 * Service: Cloudflare AI
 * Responsável por chamar o modelo de IA
 */

import { Env, CloudflareMessage, CloudflareTool, CloudflareResponse } from '../types';
import { MODEL } from '../config';
import { log } from '../utils';

/**
 * Opções para chamada de IA
 */
interface AICallOptions {
    messages: CloudflareMessage[];
    tools?: CloudflareTool[];
}

/**
 * Chama o modelo Cloudflare AI
 */
export async function callAI(
    env: Env,
    options: AICallOptions
): Promise<CloudflareResponse> {
    log('AI.RUN OPTIONS', { model: MODEL, ...options });

    const response = await env.AI.run(MODEL, {
        messages: options.messages,
        ...(options.tools && options.tools.length > 0 && { tools: options.tools })
    });

    log('CLOUDFLARE RESPONSE', response);

    return response;
}
