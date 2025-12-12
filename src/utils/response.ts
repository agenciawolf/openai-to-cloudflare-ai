/**
 * Utilitários de Response - Centralizados
 * Elimina duplicação de código para criação de responses
 */

import { OpenAIError } from '../types';
import { CORS_HEADERS } from '../config';

/** Tipos de erro padrão OpenAI */
export type ErrorType = OpenAIError['error']['type'];

/**
 * Cria response JSON com CORS headers
 */
export function jsonResponse(data: unknown, status: number = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
}

/**
 * Cria response de erro no formato OpenAI
 * Função centralizada para todos os middlewares
 */
export function errorResponse(
    message: string,
    type: ErrorType = 'api_error',
    status: number = 500
): Response {
    const error: OpenAIError = {
        error: { message, type }
    };
    return jsonResponse(error, status);
}

/**
 * Errors específicos pré-configurados
 */
export const Errors = {
    badRequest: (msg: string) => errorResponse(msg, 'invalid_request_error', 400),
    unauthorized: (msg: string) => errorResponse(msg, 'authentication_error', 401),
    methodNotAllowed: (msg: string) => errorResponse(msg, 'invalid_request_error', 405),
    internal: (msg: string) => errorResponse(msg, 'api_error', 500),
} as const;
