/**
 * Middleware de Autenticação Bearer Token
 * Verifica se o token enviado é válido usando comparação timing-safe
 */

import { Errors } from '../utils/response';

/**
 * Resultado da verificação de autenticação
 */
export interface AuthResult {
    success: boolean;
    error?: Response;
}

/**
 * Comparação timing-safe para tokens
 * Previne timing attacks comparando todos os caracteres
 */
function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
        return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

/**
 * Verifica autenticação Bearer token
 * @param request - Request HTTP
 * @param apiToken - Token esperado (do secret)
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
            error: Errors.unauthorized('Missing Authorization header')
        };
    }

    // Formato esperado: "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return {
            success: false,
            error: Errors.unauthorized('Invalid Authorization format. Expected: Bearer <token>')
        };
    }

    const token = parts[1];

    // Comparação timing-safe para prevenir timing attacks
    if (!timingSafeEqual(token, apiToken)) {
        return {
            success: false,
            error: Errors.unauthorized('Invalid API token')
        };
    }

    return { success: true };
}
