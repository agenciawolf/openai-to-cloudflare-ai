/**
 * Middleware de Autenticação Bearer Token
 * Verifica se o token enviado é válido
 */

import { OpenAIError } from '../types';
import { CORS_HEADERS } from '../config';

/**
 * Resultado da verificação de autenticação
 */
export interface AuthResult {
    success: boolean;
    error?: Response;
}

/**
 * Verifica autenticação Bearer token
 * @param request - Request HTTP
 * @param apiToken - Token esperado (do secret)
 * @returns AuthResult com success ou error response
 */
export function verifyAuth(request: Request, apiToken?: string): AuthResult {
    // Se não há token configurado, skip auth (modo desenvolvimento)
    if (!apiToken) {
        return { success: true };
    }

    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
        return {
            success: false,
            error: createAuthError('Missing Authorization header')
        };
    }

    // Formato esperado: "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return {
            success: false,
            error: createAuthError('Invalid Authorization format. Expected: Bearer <token>')
        };
    }

    const token = parts[1];
    if (token !== apiToken) {
        return {
            success: false,
            error: createAuthError('Invalid API token')
        };
    }

    return { success: true };
}

/**
 * Cria response de erro de autenticação
 */
function createAuthError(message: string): Response {
    const error: OpenAIError = {
        error: {
            message,
            type: 'authentication_error'
        }
    };

    return new Response(JSON.stringify(error), {
        status: 401,
        headers: {
            'Content-Type': 'application/json',
            ...CORS_HEADERS
        }
    });
}
