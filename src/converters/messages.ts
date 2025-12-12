/**
 * Converter: OpenAI Messages → Cloudflare Messages
 * 
 * Mapeamentos:
 * - developer → system (OpenAI GPT-4+ alias)
 * - tool_call_id → name (Cloudflare usa name para identificar tools)
 */

import { OpenAIMessage, CloudflareMessage } from '../types';

/**
 * Mapa de roles OpenAI → Cloudflare
 */
const ROLE_MAP: Record<string, CloudflareMessage['role']> = {
    'system': 'system',
    'developer': 'system',  // OpenAI GPT-4+ usa 'developer' como alias
    'user': 'user',
    'assistant': 'assistant',
    'tool': 'tool',
};

/**
 * Mapeia role OpenAI para Cloudflare
 */
function mapRole(role: string): CloudflareMessage['role'] {
    return ROLE_MAP[role] || 'user';
}

/**
 * Constrói mapa de tool_call_id → tool_name
 * Necessário porque Cloudflare usa 'name' e OpenAI usa 'tool_call_id'
 */
function buildToolCallIdMap(messages: OpenAIMessage[]): Record<string, string> {
    const map: Record<string, string> = {};

    for (const msg of messages) {
        if (msg.role === 'assistant' && msg.tool_calls) {
            for (const tc of msg.tool_calls) {
                map[tc.id] = tc.function.name;
            }
        }
    }

    return map;
}

/**
 * Converte array de messages OpenAI para Cloudflare
 */
export function convertMessages(openaiMessages: OpenAIMessage[]): CloudflareMessage[] {
    const toolCallIdMap = buildToolCallIdMap(openaiMessages);

    return openaiMessages.map(msg => {
        let content = msg.content || '';
        let name: string | undefined;

        // Tool response: mapear tool_call_id → name
        if (msg.role === 'tool') {
            content = msg.content || '';
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
                // Se falhar parse, usar vazio
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

        return cfMessage;
    });
}
