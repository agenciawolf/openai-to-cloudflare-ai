/**
 * Converter: OpenAI Messages → Cloudflare Messages
 * 
 * Single-pass otimizado: constrói mapa e converte em uma única iteração
 * 
 * Mapeamentos:
 * - developer → system (OpenAI GPT-4+ alias)
 * - tool_call_id → name (Cloudflare usa name para identificar tools)
 */

import { OpenAIMessage, CloudflareMessage } from '../types';

/**
 * Mapa de roles OpenAI → Cloudflare
 */
const ROLE_MAP: Readonly<Record<string, CloudflareMessage['role']>> = {
    'system': 'system',
    'developer': 'system',
    'user': 'user',
    'assistant': 'assistant',
    'tool': 'tool',
} as const;

/**
 * Mapeia role OpenAI para Cloudflare
 */
function mapRole(role: string): CloudflareMessage['role'] {
    return ROLE_MAP[role] || 'user';
}

/**
 * Converte array de messages OpenAI para Cloudflare
 * Otimizado: single-pass com building de map inline
 */
export function convertMessages(openaiMessages: OpenAIMessage[]): CloudflareMessage[] {
    // Construímos o mapa enquanto iteramos
    const toolCallIdMap: Record<string, string> = {};
    const result: CloudflareMessage[] = [];

    for (const msg of openaiMessages) {
        // Coletar tool_call_ids para mapeamento futuro
        if (msg.role === 'assistant' && msg.tool_calls) {
            for (const tc of msg.tool_calls) {
                toolCallIdMap[tc.id] = tc.function.name;
            }
        }

        let content = msg.content ?? '';
        let name: string | undefined;

        // Tool response: mapear tool_call_id → name
        if (msg.role === 'tool') {
            if (msg.tool_call_id && toolCallIdMap[msg.tool_call_id]) {
                name = toolCallIdMap[msg.tool_call_id];
            } else if (msg.name) {
                name = msg.name;
            }
        }

        // Assistant com tool_calls: serializar para content
        if (msg.role === 'assistant' && msg.tool_calls) {
            try {
                content = JSON.stringify(msg.tool_calls.map(tc => ({
                    name: tc.function.name,
                    arguments: JSON.parse(tc.function.arguments)
                })));
            } catch {
                content = '[]';
            }
        }

        const cfMessage: CloudflareMessage = {
            role: mapRole(msg.role),
            content
        };

        if (name) {
            cfMessage.name = name;
        }

        result.push(cfMessage);
    }

    return result;
}
