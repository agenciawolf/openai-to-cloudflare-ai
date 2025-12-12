/**
 * OpenAI → Cloudflare AI Adapter
 * 
 * Orquestrador principal que coordena todos os módulos.
 * Entry point do Cloudflare Worker.
 * 
 * @author AI Adapter Team
 * @version 2.2.0
 */

import { Env, OpenAIResponse } from './types';
import { MODEL, CORS_HEADERS } from './config';
import { verifyAuth, handleCors, validateMethod, validateBody } from './middleware';
import { convertMessages, convertTools, convertParams, createOpenAIResponse } from './converters';
import { callAI } from './services';
import { log, handleError, filterSensitiveHeaders, jsonResponse } from './utils';

/**
 * Handler principal do Worker
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // 1. Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCors();
    }

    // 2. Validar método HTTP
    const methodError = validateMethod(request);
    if (methodError) return methodError;

    // 3. Verificar autenticação
    const authResult = verifyAuth(request, env.API_TOKEN);
    if (!authResult.success) {
      return authResult.error!;
    }

    try {
      // 4. Log do request (headers filtrados)
      log('=== REQUEST RECEBIDO ===', {
        method: request.method,
        url: request.url,
        headers: filterSensitiveHeaders(Object.fromEntries(request.headers.entries()))
      });

      // 5. Validar body
      const validation = await validateBody(request);
      if (!validation.success) {
        return validation.error!;
      }
      const requestData = validation.data!;

      log('REQUEST BODY', requestData);

      // 6. Converter messages OpenAI → Cloudflare
      const cfMessages = convertMessages(requestData.messages);
      log('CLOUDFLARE MESSAGES', cfMessages);

      // 7. Converter tools se existirem
      const cfTools = requestData.tools?.length
        ? convertTools(requestData.tools)
        : undefined;

      if (cfTools) {
        log('CLOUDFLARE TOOLS', cfTools);
      }

      // 8. Converter parâmetros de geração
      const cfParams = convertParams({
        temperature: requestData.temperature,
        top_p: requestData.top_p,
        top_k: requestData.top_k,
        max_tokens: requestData.max_tokens,
        frequency_penalty: requestData.frequency_penalty,
        presence_penalty: requestData.presence_penalty,
        repetition_penalty: requestData.repetition_penalty,
        seed: requestData.seed,
      });

      log('GENERATION PARAMS', cfParams);

      // 9. Chamar Cloudflare AI com todos os parâmetros
      const cfResponse = await callAI(env, {
        messages: cfMessages,
        tools: cfTools,
        params: cfParams
      });

      // 10. Converter response Cloudflare → OpenAI
      const openaiResponse: OpenAIResponse = createOpenAIResponse(
        cfResponse,
        requestData.model || MODEL
      );

      log('OPENAI RESPONSE', openaiResponse);

      // 11. Retornar resposta
      return jsonResponse(openaiResponse);

    } catch (error) {
      return handleError(error, 'Processing request');
    }
  }
};

// Re-export Env type para uso externo
export { Env };
