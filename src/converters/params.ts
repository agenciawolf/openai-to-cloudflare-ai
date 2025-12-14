/**
 * Converter: Parâmetros de geração OpenAI → Cloudflare
 * 
 * Mapeia e valida parâmetros de geração do n8n para Cloudflare AI
 */

import { GenerationParams } from '../types/openai';
import { CloudflareGenerationParams } from '../types/cloudflare';

/**
 * Limites dos parâmetros da Cloudflare AI
 */
const CLOUDFLARE_LIMITS = {
    temperature: { min: 0, max: 5, default: 0.6 },
    top_p: { min: 0.001, max: 1 },
    top_k: { min: 1, max: 50 },
    max_tokens: { default: 256 },
    frequency_penalty: { min: -2, max: 2 },
    presence_penalty: { min: -2, max: 2 },
    repetition_penalty: { min: 0, max: 2 },
    seed: { min: 1, max: 9999999999 },
} as const;

/**
 * Clamp: limita valor entre min e max
 */
function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Converte parâmetros OpenAI para Cloudflare com validação
 */
export function convertParams(params: GenerationParams): CloudflareGenerationParams {
    const result: CloudflareGenerationParams = {};

    // Temperature
    if (params.temperature !== undefined) {
        result.temperature = clamp(
            params.temperature,
            CLOUDFLARE_LIMITS.temperature.min,
            CLOUDFLARE_LIMITS.temperature.max
        );
    }

    // Top P
    if (params.top_p !== undefined) {
        result.top_p = clamp(
            params.top_p,
            CLOUDFLARE_LIMITS.top_p.min,
            CLOUDFLARE_LIMITS.top_p.max
        );
    }

    // Top K
    if (params.top_k !== undefined) {
        result.top_k = clamp(
            params.top_k,
            CLOUDFLARE_LIMITS.top_k.min,
            CLOUDFLARE_LIMITS.top_k.max
        );
    }

    // Max tokens
    if (params.max_tokens !== undefined) {
        result.max_tokens = Math.max(1, params.max_tokens);
    }

    // Frequency penalty
    if (params.frequency_penalty !== undefined) {
        result.frequency_penalty = clamp(
            params.frequency_penalty,
            CLOUDFLARE_LIMITS.frequency_penalty.min,
            CLOUDFLARE_LIMITS.frequency_penalty.max
        );
    }

    // Presence penalty
    if (params.presence_penalty !== undefined) {
        result.presence_penalty = clamp(
            params.presence_penalty,
            CLOUDFLARE_LIMITS.presence_penalty.min,
            CLOUDFLARE_LIMITS.presence_penalty.max
        );
    }

    // Repetition penalty
    if (params.repetition_penalty !== undefined) {
        result.repetition_penalty = clamp(
            params.repetition_penalty,
            CLOUDFLARE_LIMITS.repetition_penalty.min,
            CLOUDFLARE_LIMITS.repetition_penalty.max
        );
    }

    // Seed
    if (params.seed !== undefined) {
        result.seed = clamp(
            Math.floor(params.seed),
            CLOUDFLARE_LIMITS.seed.min,
            CLOUDFLARE_LIMITS.seed.max
        );
    }

    // LoRA Support
    if (params.lora) {
        result.lora = params.lora;
    }

    // Response Format (para JSON mode)
    if (params.response_format) {
        result.response_format = params.response_format;
    }

    return result;
}
