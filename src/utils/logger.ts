/**
 * Logger estruturado para debug e produção
 */

import { DEBUG_LOGGING } from '../config';

/**
 * Log com label e dados estruturados
 * @param label - Identificador do log
 * @param data - Dados a serem logados
 */
export function log(label: string, data: unknown): void {
    if (DEBUG_LOGGING) {
        console.log(`[AI-ADAPTER] ${label}:`, JSON.stringify(data, null, 2));
    }
}

/**
 * Log de erro
 */
export function logError(label: string, error: unknown): void {
    const errorData = error instanceof Error
        ? { message: error.message, stack: error.stack }
        : { error };
    console.error(`[AI-ADAPTER] ERROR - ${label}:`, JSON.stringify(errorData, null, 2));
}

/**
 * Log de warning
 */
export function logWarn(label: string, data: unknown): void {
    console.warn(`[AI-ADAPTER] WARN - ${label}:`, JSON.stringify(data, null, 2));
}
