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
export interface AICallOptions {
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
    const runOptions = {
        messages: options.messages,
        ...(options.tools?.length && { tools: options.tools })
    };

    log('AI.RUN OPTIONS', { model: MODEL, ...runOptions });

    const response = await env.AI.run(MODEL, runOptions);

    log('CLOUDFLARE RESPONSE', response);

    return response;
}
