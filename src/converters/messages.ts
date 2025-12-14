/**
 * Converter: OpenAI Messages → Cloudflare Messages
 * 
 * Otimizado: single-pass conversion + System Logic Injection para forçar tools
 */

import { OpenAIMessage, CloudflareMessage } from '../types';

const ROLE_MAP: Readonly<Record<string, CloudflareMessage['role']>> = {
    'system': 'system',
    'developer': 'system',
    'user': 'user',
    'assistant': 'assistant',
    'tool': 'tool',
} as const;

function mapRole(role: string): CloudflareMessage['role'] {
    return ROLE_MAP[role] || 'user';
}

/**
 * Prompt injection para forçar o modelo a usar tools se disponíveis
 */
const SYSTEM_TOOL_INJECTION =
    `\n\n[SYSTEM IMPORTANT INSTRUCTION]
You have access to TOOLS.
If the user's request requires action that a tool can perform, you MUST generate a Tool Call.
DO NOT provide the answer in the content if a tool can do it.
Prioritize calling tools over writing text responses.
Output ONLY the tool call if applicable.`;

/**
 * Converte messages e injeta lógica de system se houver tools
 * @param openaiMessages - Mensagens originais
 * @param hasTools - Se há tools definidas no request
 */
export function convertMessages(
    openaiMessages: OpenAIMessage[],
    hasTools: boolean = false
): CloudflareMessage[] {
    const toolCallIdMap: Record<string, string> = {};
    const result: CloudflareMessage[] = [];

    // Encontrar a última mensagem de sistema para injetar instrução
    let lastSystemIndex = -1;
    // Se não tiver system message, vamos criar uma? Melhor injetar na última user message se necessário,
    // mas idealmente injetamos no último system.

    for (let i = 0; i < openaiMessages.length; i++) {
        const msg = openaiMessages[i];

        // Coletar tool_call_ids
        if (msg.role === 'assistant' && msg.tool_calls) {
            for (const tc of msg.tool_calls) {
                toolCallIdMap[tc.id] = tc.function.name;
            }
        }

        let content = msg.content ?? '';
        let role = mapRole(msg.role);
        let name: string | undefined;

        // Tool response mapping
        if (msg.role === 'tool') {
            if (msg.tool_call_id && toolCallIdMap[msg.tool_call_id]) {
                name = toolCallIdMap[msg.tool_call_id];
            } else if (msg.name) {
                name = msg.name;
            }
        }

        // Assistant tool calls serialization
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

        // Se é system message, marcamos índice para injeção posterior
        // (Mas só injetamos se tiver tools)
        if (role === 'system' && hasTools) {
            lastSystemIndex = result.length; // Index no array de resultado (atual)
        }

        const cfMessage: CloudflareMessage = { role, content };
        if (name) cfMessage.name = name;

        result.push(cfMessage);
    }

    // System Prompt Injection Logic
    if (hasTools) {
        if (lastSystemIndex !== -1) {
            // Append instruction to existing system message
            result[lastSystemIndex].content += SYSTEM_TOOL_INJECTION;
        } else {
            // No system message found? Prepend one.
            result.unshift({
                role: 'system',
                content: `You are a helpful assistant.${SYSTEM_TOOL_INJECTION}`
            });
        }
    }

    return result;
}
