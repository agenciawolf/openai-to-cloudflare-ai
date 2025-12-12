/**
 * Logger estruturado para debug e produção
 * Otimizado: sem formatação em produção
 */

import { DEBUG_LOGGING } from '../config';

/**
 * Headers sensíveis que não devem ser logados
 */
const SENSITIVE_HEADERS = new Set([
    'authorization',
    'cookie',
    'x-api-key',
    'api-key',
]);

/**
 * Filtra headers sensíveis dos logs
 */
export function filterSensitiveHeaders(headers: Record<string, string>): Record<string, string> {
    const filtered: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
        if (SENSITIVE_HEADERS.has(key.toLowerCase())) {
            filtered[key] = '[REDACTED]';
        } else {
            filtered[key] = value;
        }
    }
    return filtered;
}

/**
 * Stringify otimizado - sem formatação em produção
 */
function stringify(data: unknown): string {
    return DEBUG_LOGGING
        ? JSON.stringify(data, null, 2)  // Formatado para debug
        : JSON.stringify(data);           // Compacto para produção
}

/**
 * Log com label e dados estruturados
 */
export function log(label: string, data: unknown): void {
    if (DEBUG_LOGGING) {
        console.log(`[AI-ADAPTER] ${label}:`, stringify(data));
    }
}

/**
 * Log de erro (sempre executa, independente de DEBUG_LOGGING)
 */
export function logError(label: string, error: unknown): void {
    const errorData = error instanceof Error
        ? { message: error.message, stack: error.stack }
        : { error };
    console.error(`[AI-ADAPTER] ERROR - ${label}:`, stringify(errorData));
}

/**
 * Log de warning
 */
export function logWarn(label: string, data: unknown): void {
    console.warn(`[AI-ADAPTER] WARN - ${label}:`, stringify(data));
}
