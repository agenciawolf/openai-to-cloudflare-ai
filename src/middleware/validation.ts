/**
 * Middleware de Validação de Request
 */

import { OpenAIRequest, OpenAIError } from '../types';
import { CORS_HEADERS } from '../config';

/**
 * Resultado da validação
 */
export interface ValidationResult {
    success: boolean;
    data?: OpenAIRequest;
    error?: Response;
}

/**
 * Valida o método HTTP
 */
export function validateMethod(request: Request): Response | null {
    if (request.method !== 'POST') {
        const error: OpenAIError = {
            error: {
                message: 'Method not allowed. Use POST.',
                type: 'invalid_request_error'
            }
        };

        return new Response(JSON.stringify(error), {
            status: 405,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
    }
    return null;
}

/**
 * Valida e parseia o body do request
 */
export async function validateBody(request: Request): Promise<ValidationResult> {
    try {
        const data = await request.json() as OpenAIRequest;

        // Validar campo obrigatório: messages
        if (!data.messages || !Array.isArray(data.messages)) {
            return {
                success: false,
                error: createValidationError('messages is required and must be an array')
            };
        }

        // Validar que messages não está vazio
        if (data.messages.length === 0) {
            return {
                success: false,
                error: createValidationError('messages array cannot be empty')
            };
        }

        // Validar cada mensagem
        for (let i = 0; i < data.messages.length; i++) {
            const msg = data.messages[i];
            if (!msg.role) {
                return {
                    success: false,
                    error: createValidationError(`messages[${i}].role is required`)
                };
            }
        }

        // Validar tools se fornecidas
        if (data.tools) {
            if (!Array.isArray(data.tools)) {
                return {
                    success: false,
                    error: createValidationError('tools must be an array')
                };
            }

            for (let i = 0; i < data.tools.length; i++) {
                const tool = data.tools[i];
                if (tool.type !== 'function') {
                    return {
                        success: false,
                        error: createValidationError(`tools[${i}].type must be "function"`)
                    };
                }
                if (!tool.function?.name) {
                    return {
                        success: false,
                        error: createValidationError(`tools[${i}].function.name is required`)
                    };
                }
            }
        }

        return { success: true, data };

    } catch (e) {
        return {
            success: false,
            error: createValidationError('Invalid JSON in request body')
        };
    }
}

/**
 * Cria response de erro de validação
 */
function createValidationError(message: string): Response {
    const error: OpenAIError = {
        error: {
            message,
            type: 'invalid_request_error'
        }
    };

    return new Response(JSON.stringify(error), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
}
