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
// Nota: n8n/OpenAI GPT-4+ usa 'developer' como alias de 'system'
interface OpenAIMessage {
  role: 'system' | 'developer' | 'user' | 'assistant' | 'tool';
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
// Nota: Cloudflare usa 'name' para tool responses, não 'tool_call_id'
interface CloudflareMessage {
  role: string;
  content: string;
  name?: string; // Usado para identificar qual tool respondeu
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

// Modelo - usando hermes-2-pro-mistral-7b que é especificamente treinado para function calling
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
 * Mapeia roles do OpenAI/n8n para roles suportados pelo Cloudflare
 * - 'developer' (OpenAI GPT-4+ style) → 'system'
 * - 'tool' permanece como 'tool'
 * - outros permanecem iguais
 */
function mapRoleToCloudflare(role: string): string {
  const roleMap: Record<string, string> = {
    'developer': 'system',  // OpenAI GPT-4+ usa 'developer' como system
    'system': 'system',
    'user': 'user',
    'assistant': 'assistant',
    'tool': 'tool',
  };
  return roleMap[role] || 'user'; // fallback para user se role desconhecido
}

/**
 * Converte messages do formato OpenAI para Cloudflare
 * 
 * IMPORTANTE: Cloudflare usa 'name' para identificar tool responses,
 * não 'tool_call_id' como a OpenAI. Precisamos mapear isso.
 */
function convertMessagesToCloudflare(openaiMessages: OpenAIMessage[]): CloudflareMessage[] {
  // Construir mapa de tool_call_id -> tool_name dos tool_calls anteriores
  const toolCallIdToName: Record<string, string> = {};

  for (const msg of openaiMessages) {
    if (msg.role === 'assistant' && msg.tool_calls) {
      for (const tc of msg.tool_calls) {
        toolCallIdToName[tc.id] = tc.function.name;
      }
    }
  }

  return openaiMessages.map(msg => {
    let content = msg.content || '';
    let name: string | undefined;

    // Se é uma mensagem tool response, usar o name da tool
    if (msg.role === 'tool') {
      content = msg.content || '';
      // Buscar o nome da tool pelo tool_call_id
      if (msg.tool_call_id && toolCallIdToName[msg.tool_call_id]) {
        name = toolCallIdToName[msg.tool_call_id];
      } else if (msg.name) {
        // Fallback: usar nome direto se fornecido
        name = msg.name;
      }
    }

    // Se assistant tem tool_calls, converter para content
    // (Cloudflare não usa tool_calls no histórico, converte para texto)
    if (msg.role === 'assistant' && msg.tool_calls) {
      content = JSON.stringify(msg.tool_calls.map(tc => ({
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments)
      })));
    }

    // Mapear role para formato Cloudflare
    const mappedRole = mapRoleToCloudflare(msg.role);

    const cfMessage: CloudflareMessage = {
      role: mappedRole,
      content: content
    };

    // Adicionar name se for mensagem tool
    if (name) {
      cfMessage.name = name;
    }

    return cfMessage;
  });
}

/**
 * Cria resposta no formato OpenAI
 * IMPORTANTE: content NUNCA pode ser null/vazio quando não há tool_calls
 * ou o n8n vai dar erro "model output must contain either output text or tool calls"
 */
function createOpenAIResponse(
  content: string | null,
  toolCalls: OpenAIToolCall[] | undefined,
  model: string
): object {
  const hasToolCalls = toolCalls && toolCalls.length > 0;

  // Garantir que content nunca seja null/vazio quando não há tool_calls
  let finalContent: string | null = content;
  if (!hasToolCalls) {
    if (!content || content.trim().length === 0) {
      finalContent = 'Desculpe, não consegui processar sua solicitação.';
    }
  } else {
    finalContent = null; // Quando há tool_calls, content deve ser null
  }

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
          content: finalContent,
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

      // Verificar se resposta está vazia (bug do modelo)
      const hasResponse = cfResult.response && cfResult.response.trim().length > 0;
      const hasToolCalls = cfResult.tool_calls && cfResult.tool_calls.length > 0;

      if (!hasResponse && !hasToolCalls) {
        log('WARNING', 'Cloudflare retornou resposta vazia! Usando fallback.');
        // Fallback: retornar mensagem indicando que precisa de mais contexto
        const fallbackResponse = createOpenAIResponse(
          'Desculpe, não consegui processar sua solicitação. Por favor, tente novamente com mais detalhes.',
          undefined,
          requestData.model || MODEL
        );
        return new Response(JSON.stringify(fallbackResponse), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // Converter resposta para formato OpenAI
      let openaiToolCalls: OpenAIToolCall[] | undefined;
      if (hasToolCalls) {
        openaiToolCalls = convertToolCallsToOpenAI(cfResult.tool_calls!);
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
