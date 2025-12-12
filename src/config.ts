/**
 * Configurações e constantes da aplicação
 */

// Modelo que suporta function calling nativamente
export const MODEL = '@hf/nousresearch/hermes-2-pro-mistral-7b';

// Habilitar logging (pode ser controlado por env var no futuro)
export const DEBUG_LOGGING = true;

// Headers CORS padrão
export const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
} as const;
