/**
 * OpenAI to Cloudflare Workers AI Adapter
 * Suporta chat completions e function calling (tools)
 * 
 * Modelo: @hf/nousresearch/hermes-2-pro-mistral-7b (suporta tools)
 */

// ============================================================================
// TIPOS
// ============================================================================

// Tipos OpenAI (o que n8n envia)
interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
  name?: string;
}

interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: object;
  };
}

interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

interface OpenAIRequest {
  model?: string;
  messages: OpenAIMessage[];
  tools?: OpenAITool[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

// Tipos Cloudflare (o que enviamos para AI.run)
interface CloudflareMessage {
  role: string;
  content: string;
}

interface CloudflareTool {
  name: string;
  description: string;
  parameters: object;
}

interface CloudflareToolCall {
  name: string;
  arguments: object;
}

interface CloudflareResponse {
  response?: string;
  tool_calls?: CloudflareToolCall[];
}

// Environment
export interface Env {
  AI: {
    run: (model: string, options: {
      messages: CloudflareMessage[];
      tools?: CloudflareTool[];
    }) => Promise<CloudflareResponse>;
  };
}

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

// Modelo que suporta function calling
const MODEL = '@hf/nousresearch/hermes-2-pro-mistral-7b';

// Habilitar logging detalhado (true para debug, false para produção)
const DEBUG_LOGGING = true;

// ============================================================================
// HELPERS
// ============================================================================

function generateId(): string {
  return 'chatcmpl-' + Math.random().toString(36).substring(2, 15);
}

function generateToolCallId(): string {
  return 'call_' + Math.random().toString(36).substring(2, 15);
}

/**
 * Converte tools do formato OpenAI para Cloudflare
 */
function convertToolsToCloudflare(openaiTools: OpenAITool[]): CloudflareTool[] {
  return openaiTools.map(tool => ({
    name: tool.function.name,
    description: tool.function.description,
    parameters: tool.function.parameters
  }));
}

/**
 * Converte tool_calls do formato Cloudflare para OpenAI
 */
function convertToolCallsToOpenAI(cfToolCalls: CloudflareToolCall[]): OpenAIToolCall[] {
  return cfToolCalls.map(tc => ({
    id: generateToolCallId(),
    type: 'function' as const,
    function: {
      name: tc.name,
      arguments: typeof tc.arguments === 'string'
        ? tc.arguments
        : JSON.stringify(tc.arguments)
    }
  }));
}

/**
 * Converte messages do formato OpenAI para Cloudflare
 */
function convertMessagesToCloudflare(openaiMessages: OpenAIMessage[]): CloudflareMessage[] {
  return openaiMessages.map(msg => {
    let content = msg.content || '';

    // Se é uma mensagem tool response, formatar adequadamente
    if (msg.role === 'tool' && msg.tool_call_id) {
      content = msg.content || '';
    }

    // Se assistant tem tool_calls, converter para content
    if (msg.role === 'assistant' && msg.tool_calls) {
      content = JSON.stringify(msg.tool_calls.map(tc => ({
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments)
      })));
    }

    return {
      role: msg.role === 'tool' ? 'tool' : msg.role,
      content: content
    };
  });
}

/**
 * Cria resposta no formato OpenAI
 */
function createOpenAIResponse(
  content: string | null,
  toolCalls: OpenAIToolCall[] | undefined,
  model: string
): object {
  const hasToolCalls = toolCalls && toolCalls.length > 0;

  return {
    id: generateId(),
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: hasToolCalls ? null : content,
          ...(hasToolCalls && { tool_calls: toolCalls })
        },
        finish_reason: hasToolCalls ? 'tool_calls' : 'stop'
      }
    ],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    }
  };
}

/**
 * Log helper para debug
 */
function log(label: string, data: unknown): void {
  if (DEBUG_LOGGING) {
    console.log(`[AI-ADAPTER] ${label}:`, JSON.stringify(data, null, 2));
  }
}

// ============================================================================
// HANDLER PRINCIPAL
// ============================================================================

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Validar método
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({
        error: { message: 'Method not allowed. Use POST.', type: 'invalid_request_error' }
      }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    try {
      // Parse request body
      const requestData = await request.json() as OpenAIRequest;

      // ========================================
      // 🔍 LOGGING DETALHADO DO REQUEST (FASE 1)
      // ========================================
      log('=== REQUEST RECEBIDO ===', {
        method: request.method,
        url: request.url,
        headers: Object.fromEntries(request.headers.entries())
      });
      log('REQUEST BODY COMPLETO', requestData);
      log('MESSAGES', requestData.messages);
      log('TOOLS', requestData.tools);
      log('TOOL_CHOICE', requestData.tool_choice);
      // ========================================

      // Validar messages
      if (!requestData.messages || !Array.isArray(requestData.messages)) {
        return new Response(JSON.stringify({
          error: { message: 'messages is required and must be an array', type: 'invalid_request_error' }
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // Converter messages para formato Cloudflare
      const cfMessages = convertMessagesToCloudflare(requestData.messages);
      log('CLOUDFLARE MESSAGES', cfMessages);

      // Converter tools se existirem
      let cfTools: CloudflareTool[] | undefined;
      if (requestData.tools && requestData.tools.length > 0) {
        cfTools = convertToolsToCloudflare(requestData.tools);
        log('CLOUDFLARE TOOLS', cfTools);
      }

      // Chamar Cloudflare AI
      const aiOptions: { messages: CloudflareMessage[]; tools?: CloudflareTool[] } = {
        messages: cfMessages,
      };

      if (cfTools) {
        aiOptions.tools = cfTools;
      }

      log('AI.RUN OPTIONS', { model: MODEL, ...aiOptions });

      const cfResult = await env.AI.run(MODEL, aiOptions);

      log('CLOUDFLARE RESPONSE', cfResult);

      // Converter resposta para formato OpenAI
      let openaiToolCalls: OpenAIToolCall[] | undefined;
      if (cfResult.tool_calls && cfResult.tool_calls.length > 0) {
        openaiToolCalls = convertToolCallsToOpenAI(cfResult.tool_calls);
        log('OPENAI TOOL_CALLS', openaiToolCalls);
      }

      const openaiResponse = createOpenAIResponse(
        cfResult.response || null,
        openaiToolCalls,
        requestData.model || MODEL
      );

      log('OPENAI RESPONSE FINAL', openaiResponse);

      return new Response(JSON.stringify(openaiResponse), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log('ERROR', { error: errorMessage, stack: error instanceof Error ? error.stack : undefined });

      return new Response(JSON.stringify({
        error: {
          message: `An error occurred: ${errorMessage}`,
          type: 'api_error'
        }
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
