/**
 * Configurações e constantes da aplicação
 */

// Modelo principal (suporta function calling)
export const MODEL = '@hf/nousresearch/hermes-2-pro-mistral-7b';

// Modelo de fallback (caso o principal falhe)
export const FALLBACK_MODEL = '@cf/meta/llama-3.1-8b-instruct';

// Configurações de retry
export const AI_CONFIG = {
    maxRetries: 2,
    retryDelayMs: 500,
    timeoutMs: 30000,
} as const;

// Habilitar logging (pode ser controlado por env var no futuro)
export const DEBUG_LOGGING = true;

// Headers CORS padrão
export const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
} as const;
