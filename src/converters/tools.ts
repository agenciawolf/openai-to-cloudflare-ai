/**
 * Converter: OpenAI Tools → Cloudflare Tools
 * 
 * OpenAI: { type: "function", function: { name, description, parameters } }
 * Cloudflare: { name, description, parameters }
 */

import { OpenAITool, CloudflareTool } from '../types';

/**
 * Converte array de tools OpenAI para Cloudflare
 */
export function convertTools(openaiTools: OpenAITool[]): CloudflareTool[] {
    return openaiTools.map(tool => ({
        name: tool.function.name,
        description: tool.function.description || '',
        parameters: tool.function.parameters || { type: 'object', properties: {} }
    }));
}
