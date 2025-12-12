/**
 * Generators de ID criptograficamente seguros
 */

/**
 * Gera ID único para chat completion usando crypto
 */
export function generateCompletionId(): string {
    return 'chatcmpl-' + crypto.randomUUID().replace(/-/g, '').substring(0, 12);
}

/**
 * Gera ID único para tool call usando crypto
 */
export function generateToolCallId(): string {
    return 'call_' + crypto.randomUUID().replace(/-/g, '').substring(0, 12);
}
