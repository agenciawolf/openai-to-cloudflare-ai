/**
 * Error handling padronizado
 */

import { Errors } from './response';
import { logError } from './logger';

/**
 * Handler de erros genérico
 */
export function handleError(e: unknown, context: string): Response {
    logError(context, e);

    const message = e instanceof Error ? e.message : 'An unexpected error occurred';
    return Errors.internal(`${context}: ${message}`);
}
