/**
 * Error handling padronizado
 */

import { OpenAIError } from '../types';
import { CORS_HEADERS } from '../config';
import { logError } from './logger';

/**
 * Cria resposta de erro no formato OpenAI
 */
export function createErrorResponse(
    message: string,
    type: OpenAIError['error']['type'] = 'api_error',
    status: number = 500
): Response {
    const error: OpenAIError = {
        error: { message, type }
    };

    return new Response(JSON.stringify(error), {
        status,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
}

/**
 * Handler de erros genérico
 */
export function handleError(e: unknown, context: string): Response {
    logError(context, e);

    const message = e instanceof Error ? e.message : 'An unexpected error occurred';
    return createErrorResponse(`${context}: ${message}`);
}
