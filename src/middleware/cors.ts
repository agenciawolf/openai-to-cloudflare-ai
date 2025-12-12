/**
 * Middleware CORS
 * Gerencia headers e preflight requests
 */

import { CORS_HEADERS } from '../config';

/**
 * Cria response para preflight OPTIONS
 */
export function handleCors(): Response {
    return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
    });
}

/**
 * Adiciona headers CORS a um objeto de headers
 */
export function addCorsHeaders(headers: Record<string, string>): Record<string, string> {
    return {
        ...headers,
        ...CORS_HEADERS
    };
}
