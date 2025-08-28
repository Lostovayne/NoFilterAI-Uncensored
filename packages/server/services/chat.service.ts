import { Search } from '@upstash/search';
import * as crypto from 'crypto-js';
import Openai from 'openai';
import { conversationRepository } from '../repositories/conversation.repository';
import { memoryTool, retrieveConversationMemory } from '../tools/memory-tool.example';
import { type ChatRequest, type ChatResponse } from '../types/model.types';
import { contextManagerService } from './context-manager.service';
import { modelSelectorService } from './model-selector.service';

// Implementation details
const client = new Openai({
   baseURL: 'https://openrouter.ai/api/v1',
   apiKey: process.env.OPENROUTER_API_KEY,
});

// Upstash search setup con manejo de errores
let searchClient: any = null;
let index: any = null;

try {
   searchClient = Search.fromEnv();
   index = searchClient.index('knowledge-base');
   console.log('✅ Upstash Search inicializado correctamente');
} catch (error: any) {
   console.warn('⚠️ Upstash Search no disponible:', error?.message || 'Error desconocido');
   console.log('🔧 Herramientas de conocimiento deshabilitadas');
}

// Definición de las herramientas según el modelo
const getToolsForModel = (
   supportsTools: boolean,
   useMemory: boolean,
   useKnowledgeBase: boolean
) => {
   if (!supportsTools) return undefined;

   const tools = [];

   if (useKnowledgeBase) {
      tools.push({
         type: 'function' as const,
         function: {
            name: 'addResource',
            description: 'añadir un recurso o información a tu base de conocimiento',
            parameters: {
               type: 'object',
               properties: {
                  resource: {
                     type: 'string',
                     description:
                        'el contenido o recurso que se va a añadir a la base de conocimiento',
                  },
               },
               required: ['resource'],
            },
         },
      });

      tools.push({
         type: 'function' as const,
         function: {
            name: 'getInformation',
            description: 'obtener información de tu base de conocimiento para responder preguntas.',
            parameters: {
               type: 'object',
               properties: {
                  query: {
                     type: 'string',
                     description: 'la pregunta del usuario',
                  },
               },
               required: ['query'],
            },
         },
      });
   }

   if (useMemory) {
      tools.push(memoryTool);
   }

   return tools.length > 0 ? tools : undefined;
};

// Funciones de las herramientas
async function addResource(resource: string) {
   try {
      if (!index) {
         return { success: false, message: 'Base de conocimiento no disponible' };
      }
      const id = crypto.SHA256(resource).toString();
      await index.upsert({
         id,
         content: { resource },
         metadata: {
            message: resource,
            type: 'User Information',
         },
      });
      return { success: true, message: 'Recurso añadido a la base de conocimiento correctamente' };
   } catch (error) {
      console.error('Error al añadir recurso:', error);
      return { success: false, message: 'Error al añadir el recurso a la base de conocimiento' };
   }
}

async function getInformation(query: string) {
   try {
      if (!index) {
         return { results: [], message: 'Base de conocimiento no disponible' };
      }
      const results = await index.search({ query });
      return results;
   } catch (error) {
      console.error('Error al buscar en la base de conocimiento:', error);
      return { results: [], message: 'Error al buscar en la base de conocimiento' };
   }
}

// Ejecutor de herramientas
async function executeToolCall(toolCall: any, conversationId: string) {
   if (!('function' in toolCall)) {
      return { error: 'Formato de llamada de herramienta inválido' };
   }

   const { name, arguments: args } = toolCall.function;
   const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;

   switch (name) {
      case 'addResource':
         return await addResource(parsedArgs.resource);
      case 'getInformation':
         return await getInformation(parsedArgs.query);
      case 'retrieveConversationMemory':
         return await retrieveConversationMemory(
            conversationId,
            parsedArgs.query,
            parsedArgs.timeframe
         );
      default:
         return { error: `Herramienta desconocida: ${name}` };
   }
}

// Public interface
export const chatService = {
   async sendMessage(request: ChatRequest): Promise<ChatResponse> {
      try {
         console.log('🚀 Iniciando chat request:', {
            modelType: request.modelType,
            useMemory: request.useMemory,
            useKnowledgeBase: request.useKnowledgeBase,
         });

         const { prompt, conversationId, modelType, taskType, useMemory, useKnowledgeBase } =
            request;

         // 1. Seleccionar modelo apropiado
         const selectedModel = modelSelectorService.selectModel(modelType!, taskType!, useMemory!);
         const supportsTools = modelSelectorService.supportsTools(modelType!, useMemory!);

         console.log('🤖 Modelo seleccionado:', selectedModel.name);
         console.log('🔧 Soporta herramientas:', supportsTools); // 2. Gestionar historial de conversación
         const history = conversationRepository.getConversationHistory(conversationId);

         if (history.length === 0) {
            conversationRepository.addMessageToConversation(conversationId, {
               role: 'system',
               content: process.env.SYSTEM_PROMPT || 'Tu eres una chica muy inteligente y creativa',
            });
         }

         conversationRepository.addMessageToConversation(conversationId, {
            role: 'user',
            content: prompt,
         });

         // 3. Obtener contexto optimizado si el modelo soporta herramientas
         let messages;
         if (supportsTools && useMemory) {
            const contextInfo = contextManagerService.getOptimizedContext(conversationId);
            messages = contextInfo.messages;
         } else {
            messages = conversationRepository.getConversationHistory(conversationId);
         }

         // 4. Obtener herramientas según el modelo
         const tools = getToolsForModel(supportsTools, useMemory!, useKnowledgeBase!);
         const toolsUsed: string[] = [];

         // 5. Hacer llamada al modelo
         const response = await client.chat.completions.create({
            model: selectedModel.name,
            messages: messages,
            max_completion_tokens: selectedModel.maxTokens,
            prompt_cache_key: conversationId,
            ...(tools && { tools }),
         });

         const message = response.choices[0]?.message;
         let content = message?.content || '';

         // 6. Procesar tool calls si existen y el modelo los soporta
         if (supportsTools && message?.tool_calls && message.tool_calls.length > 0) {
            let toolResults = '';

            for (const toolCall of message.tool_calls) {
               const toolResult = await executeToolCall(toolCall, conversationId);
               const functionName = 'function' in toolCall ? toolCall.function.name : 'desconocida';
               toolsUsed.push(functionName);
               toolResults += `\nResultado de herramienta ${functionName}: ${JSON.stringify(toolResult)}`;
            }

            // Agregar el contexto de las herramientas al contenido
            conversationRepository.addMessageToConversation(conversationId, {
               role: 'assistant',
               content: `Contexto de ejecución de herramientas: ${toolResults}`,
            });

            // Hacer segunda llamada para respuesta final
            const followUpResponse = await client.chat.completions.create({
               model: selectedModel.name,
               messages: conversationRepository.getConversationHistory(conversationId),
               max_completion_tokens: selectedModel.maxTokens,
               prompt_cache_key: conversationId,
            });

            const finalContent =
               followUpResponse.choices[0]?.message?.content || 'No se generó respuesta';

            conversationRepository.addMessageToConversation(conversationId, {
               role: 'assistant',
               content: finalContent,
            });

            return {
               id: followUpResponse.id,
               message: finalContent,
               modelUsed: selectedModel.name,
               toolsUsed,
               conversationId,
            };
         } else {
            // Sin tool calls, respuesta normal
            conversationRepository.addMessageToConversation(conversationId, {
               role: 'assistant',
               content,
            });

            return {
               id: response.id,
               message: content,
               modelUsed: selectedModel.name,
               toolsUsed,
               conversationId,
            };
         }
      } catch (error) {
         console.error('❌ Error en chat service:', error);
         throw error;
      }
   },
};
