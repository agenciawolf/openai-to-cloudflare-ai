/**
 * Middleware de Validação de Request
 */

import { OpenAIRequest } from '../types';
import { Errors } from '../utils/response';

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
        return Errors.methodNotAllowed('Method not allowed. Use POST.');
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
                error: Errors.badRequest('messages is required and must be an array')
            };
        }

        // Validar que messages não está vazio
        if (data.messages.length === 0) {
            return {
                success: false,
                error: Errors.badRequest('messages array cannot be empty')
            };
        }

        // Validar cada mensagem
        for (let i = 0; i < data.messages.length; i++) {
            const msg = data.messages[i];
            if (!msg.role) {
                return {
                    success: false,
                    error: Errors.badRequest(`messages[${i}].role is required`)
                };
            }
        }

        // Validar tools se fornecidas
        if (data.tools) {
            if (!Array.isArray(data.tools)) {
                return {
                    success: false,
                    error: Errors.badRequest('tools must be an array')
                };
            }

            for (let i = 0; i < data.tools.length; i++) {
                const tool = data.tools[i];
                if (tool.type !== 'function') {
                    return {
                        success: false,
                        error: Errors.badRequest(`tools[${i}].type must be "function"`)
                    };
                }
                if (!tool.function?.name) {
                    return {
                        success: false,
                        error: Errors.badRequest(`tools[${i}].function.name is required`)
                    };
                }
            }
        }

        return { success: true, data };

    } catch {
        return {
            success: false,
            error: Errors.badRequest('Invalid JSON in request body')
        };
    }
}
