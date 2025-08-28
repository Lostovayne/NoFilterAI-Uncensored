import { Search } from '@upstash/search';
import * as crypto from 'crypto-js';
import Openai from 'openai';
import { conversationRepository } from '../repositories/conversation.repository';
import { memoryTool, retrieveConversationMemory } from '../tools/memory-tool.example';
import type { ChatRequest, ChatResponse } from '../types/model.types';
import { TaskType, MessageRole } from '../types/model.types';
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

// Prompt del sistema natural - usa herramientas de forma transparente
const getNaturalSystemPrompt = (useKnowledgeBase: boolean, useMemory: boolean) => {
   let prompt = process.env.SYSTEM_PROMPT || 'Eres una IA inteligente, amigable y útil.';

   if (useKnowledgeBase || useMemory) {
      prompt += `\n\nTienes una excelente memoria y conoces bien a las personas con las que hablas. Recuerdas sus gustos, preferencias, experiencias y detalles importantes que han compartido contigo en conversaciones anteriores.\n\nCuando alguien te cuenta algo importante sobre sí mismo, lo recuerdas naturalmente. Cuando interactúas, usas esta información de manera natural y conversacional, como lo haría un buen amigo que te conoce bien.\n\nNUNCA menciones que estás "buscando en tu memoria" o "guardando información". Simplemente actúa como si naturalmente recordaras estas cosas sobre la persona.`;
   }

   return prompt;
};

// Definición de herramientas con descripciones internas (no visibles al usuario)
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
            name: 'storeUserInfo',
            description:
               'Store important user information that should be remembered for future conversations. Use whenever the user shares personal details, preferences, habits, or experiences. Examples: sleep schedule, food preferences, hobbies, work details, personal facts.',
            parameters: {
               type: 'object',
               properties: {
                  info: {
                     type: 'string',
                     description:
                        'Clear, specific information about the user in English (e.g., "User goes to sleep around 2 AM", "User prefers coffee without sugar", "User works as a programmer from home")',
                  },
               },
               required: ['info'],
            },
         },
      });

      tools.push({
         type: 'function' as const,
         function: {
            name: 'recallUserInfo',
            description:
               'Retrieve previously stored information about the user to provide personalized responses. Use when you need to recall user preferences, habits, or personal details mentioned in previous conversations.',
            parameters: {
               type: 'object',
               properties: {
                  query: {
                     type: 'string',
                     description:
                        'What information to search for about the user in English (e.g., "sleep schedule", "food preferences", "work details", "hobbies")',
                  },
               },
               required: ['query'],
            },
         },
      });
   }

   if (useMemory) {
      tools.push({
         type: 'function' as const,
         function: {
            name: 'searchConversation',
            description: 'Search previous messages in current conversation for context.',
            parameters: {
               type: 'object',
               properties: {
                  query: {
                     type: 'string',
                     description: 'What to search for in conversation history',
                  },
                  timeframe: {
                     type: 'string',
                     enum: ['recent', 'middle', 'beginning', 'all'],
                     description: 'Which part of conversation to search',
                  },
               },
               required: ['query'],
            },
         },
      });
   }

   return tools.length > 0 ? tools : undefined;
}; // Funciones de herramientas naturales y silenciosas
async function storeUserInfo(info: string) {
   try {
      if (!index) {
         console.warn('🚨 Sistema de memoria no disponible para almacenar:', info.substring(0, 50));
         return { success: false, silent: true };
      }

      console.log('💾 Almacenando información del usuario:', info.substring(0, 100) + '...');

      const id = crypto.SHA256(info).toString();
      const timestamp = new Date().toISOString();

      const dataToStore = {
         id,
         content: { resource: info },
         metadata: {
            message: info,
            type: 'User Information',
            timestamp,
            source: 'natural_conversation',
         },
      };

      console.log('🔧 Estructura de datos a almacenar:');
      console.log('  - ID:', id);
      console.log('  - Content:', JSON.stringify(dataToStore.content));
      console.log('  - Metadata:', JSON.stringify(dataToStore.metadata));

      await index.upsert(dataToStore);

      console.log('✅ Información almacenada silenciosamente');

      // Verificar inmediatamente si se almacenó correctamente
      setTimeout(async () => {
         try {
            console.log('🔍 Verificando almacenamiento...');
            const verifyResults = await index.search({ query: info.substring(0, 20) });
            console.log(
               `  Verificación: ${verifyResults?.results?.length || 0} resultados encontrados`
            );
         } catch (verifyError) {
            console.log(
               '  Error en verificación:',
               verifyError instanceof Error ? verifyError.message : String(verifyError)
            );
         }
      }, 1000);

      return { success: true, silent: true };
   } catch (error) {
      console.error('❌ Error al almacenar información:', error);
      console.error('  Stack:', error instanceof Error ? error.stack : 'No stack available');
      return { success: false, silent: true };
   }
}

async function recallUserInfo(query: string) {
   try {
      if (!index) {
         console.warn('🚨 Sistema de memoria no disponible para buscar:', query);
         return { results: [], silent: true };
      }

      console.log('🔍 Buscando información sobre el usuario:', query);
      console.log('🔧 Detalles de la búsqueda:');
      console.log('  - Index disponible: ✅');
      console.log('  - Query:', query);

      // Intentar diferentes tipos de búsqueda para diagnóstico
      const searches = [
         { name: 'query original', params: { query } },
         { name: 'query vacía', params: { query: '' } },
         { name: 'wildcard', params: { query: '*' } },
         { name: 'simple', params: { query: 'usuario' } },
      ];

      let bestResults = null;

      for (const search of searches) {
         try {
            console.log(`  🔍 Probando ${search.name}...`);
            const results = await index.search(search.params);
            console.log(`    Resultados: ${results?.results?.length || 0}`);

            if (results?.results && results.results.length > 0) {
               console.log(`    ✅ Éxito con ${search.name}!`);
               if (!bestResults || results.results.length > bestResults.results.length) {
                  bestResults = results;
               }

               // Mostrar estructura del primer resultado
               const firstResult = results.results[0];
               console.log('    Estructura del resultado:');
               console.log('      - ID:', firstResult.id);
               console.log('      - Data:', JSON.stringify(firstResult.data));
               console.log('      - Metadata:', JSON.stringify(firstResult.metadata));
               console.log('      - Score:', firstResult.score);
            }
         } catch (searchError) {
            console.log(
               `    ❌ Error en ${search.name}:`,
               searchError instanceof Error ? searchError.message : String(searchError)
            );
         }
      }

      const finalResults = bestResults || { results: [] };
      console.log(`📊 Resultado final: ${finalResults?.results?.length || 0} resultados`);

      return { ...finalResults, silent: true };
   } catch (error) {
      console.error('❌ Error al buscar información:', error);
      console.error('  Stack:', error instanceof Error ? error.stack : 'No stack available');
      return { results: [], silent: true };
   }
}

async function searchConversation(
   conversationId: string,
   query: string,
   timeframe: string = 'all'
) {
   try {
      console.log('🔍 Buscando en conversación:', query);
      const result = await retrieveConversationMemory(conversationId, query, timeframe as any);
      return { ...result, silent: true };
   } catch (error) {
      console.error('❌ Error al buscar en conversación:', error);
      return { found: false, silent: true };
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
      case 'storeUserInfo':
         return await storeUserInfo(parsedArgs.info);
      case 'recallUserInfo':
         return await recallUserInfo(parsedArgs.query);
      case 'searchConversation':
         return await searchConversation(conversationId, parsedArgs.query, parsedArgs.timeframe);
      // Mantener compatibilidad con nombres antiguos
      case 'addResource':
         return await storeUserInfo(parsedArgs.resource);
      case 'getInformation':
         return await recallUserInfo(parsedArgs.query);
      case 'retrieveConversationMemory':
         return await searchConversation(conversationId, parsedArgs.query, parsedArgs.timeframe);
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
         // 3. Gestionar historial de conversación y buscar información del usuario automáticamente
         const history = await conversationRepository.getHistory(conversationId);

         if (history.length === 0) {
            const naturalPrompt = getNaturalSystemPrompt(useKnowledgeBase!, useMemory!);
            await conversationRepository.addMessage(conversationId, {
               role: MessageRole.SYSTEM,
               content: naturalPrompt,
            });
         }

         // Búsqueda automática de información del usuario para personalizar la respuesta
         let userContext = '';
         if (useKnowledgeBase && supportsTools && index) {
            try {
               console.log('🔍 Buscando automáticamente información sobre el usuario...');
               const userInfoSearch = await recallUserInfo(
                  'usuario preferencias gustos información personal'
               );
               if (userInfoSearch.results && userInfoSearch.results.length > 0) {
                  const relevantInfo = userInfoSearch.results
                     .slice(0, 3)
                     .map((r: any) => r.data?.message || r.metadata?.message)
                     .filter(Boolean);
                  if (relevantInfo.length > 0) {
                     userContext = `Contexto del usuario: ${relevantInfo.join('. ')}`;
                     console.log(
                        '✅ Información del usuario encontrada para personalizar respuesta'
                     );
                  }
               }
            } catch (error) {
               console.log('⚠️ No se pudo obtener contexto del usuario:', error);
            }
         }

         await conversationRepository.addMessage(conversationId, {
            role: MessageRole.USER,
            content: prompt,
         });

         // 4. Obtener contexto optimizado si el modelo soporta herramientas
         let messages;
         if (supportsTools && useMemory) {
            const contextInfo = await contextManagerService.getOptimizedContext(conversationId);
            messages = [...contextInfo.messages]; // Crear copia mutable
         } else {
            const historyMessages = await conversationRepository.getHistory(conversationId);
            messages = [...historyMessages]; // Crear copia mutable
         }

         // Añadir contexto del usuario si está disponible
         if (userContext && messages.length > 0) {
            // Añadir el contexto al mensaje del sistema o crear uno nuevo
            const systemMsgIndex = messages.findIndex((m) => m.role === MessageRole.SYSTEM);
            if (systemMsgIndex >= 0 && messages[systemMsgIndex]) {
               const systemMsg = messages[systemMsgIndex];
               messages[systemMsgIndex] = {
                  role: systemMsg.role,
                  content: systemMsg.content + `\n\n${userContext}`,
                  timestamp: systemMsg.timestamp,
                  metadata: systemMsg.metadata,
               };
            } else {
               messages.unshift({
                  role: MessageRole.SYSTEM,
                  content: userContext,
                  timestamp: new Date(),
               });
            }
         }

         // 5. Obtener herramientas según el modelo
         const tools = getToolsForModel(supportsTools, useMemory!, useKnowledgeBase!);
         const toolsUsed: string[] = [];

         // Convert messages to OpenAI format
         const openaiMessages = messages.map((msg) => ({
            role: msg.role as 'user' | 'assistant' | 'system',
            content: msg.content,
         }));

         // 6. Hacer llamada al modelo
         const requestPayload: any = {
            model: selectedModel.name,
            messages: openaiMessages,
            max_completion_tokens: selectedModel.maxTokens,
            prompt_cache_key: conversationId,
            ...(tools && { tools }),
         };

         // ✅ NUEVO: Agregar modalities para generación de imágenes
         if (taskType === TaskType.IMAGE) {
            requestPayload.modalities = ['image', 'text'];
         }

         // 🔧 DEBUG: Logging del payload
         console.log('📦 Payload enviado al modelo:');
         console.log('  - Modelo:', requestPayload.model);
         console.log('  - Mensajes:', requestPayload.messages.length);
         console.log('  - Herramientas disponibles:', tools ? tools.length : 0);
         if (tools) {
            console.log(
               '  - Nombres de herramientas:',
               tools.map((t) => t.function.name)
            );
            console.log('  - Herramientas completas:', JSON.stringify(tools, null, 2));
         }
         console.log('  - Max tokens:', requestPayload.max_completion_tokens);

         const response = await client.chat.completions.create(requestPayload);

         const message: any = response.choices[0]?.message;
         let content = message?.content || '';

         // 🔧 DEBUG: Logging de la respuesta
         console.log('📬 Respuesta recibida del modelo:');
         console.log('  - Content:', content);
         console.log('  - Tool calls:', message?.tool_calls ? message.tool_calls.length : 0);
         if (message?.tool_calls) {
            console.log('  - Tool calls detalles:', JSON.stringify(message.tool_calls, null, 2));
         }

         // ✅ NUEVO: Extraer imágenes si existen
         const images = message?.images || [];

         // 🔧 FALLBACK: Detectar tool calls en texto plano
         let detectedToolCalls = [];
         if (supportsTools && (!message?.tool_calls || message.tool_calls.length === 0)) {
            console.log('🔍 Buscando tool calls en texto plano...');

            // Patrones para detectar llamadas a herramientas en el texto
            const toolPatterns = [
               /storeUserInfo\(info="([^"]+)"\)/g,
               /recallUserInfo\(query="([^"]+)"\)/g,
               /searchConversation\(query="([^"]+)"\)/g,
            ];

            const toolNames = ['storeUserInfo', 'recallUserInfo', 'searchConversation'];

            for (let i = 0; i < toolPatterns.length; i++) {
               const pattern = toolPatterns[i];
               const toolName = toolNames[i];
               const matches = [...content.matchAll(pattern)];

               for (const match of matches) {
                  console.log(`✅ Detectado ${toolName} en texto:`, match[1]);

                  // Crear tool call falso para procesamiento
                  const fakeToolCall = {
                     function: {
                        name: toolName,
                        arguments:
                           toolName === 'storeUserInfo'
                              ? JSON.stringify({ info: match[1] })
                              : JSON.stringify({ query: match[1] }),
                     },
                  };

                  detectedToolCalls.push(fakeToolCall);
               }
            }

            if (detectedToolCalls.length > 0) {
               console.log(
                  `🎉 Detectadas ${detectedToolCalls.length} llamadas a herramientas en texto plano`
               );
               // Limpiar el contenido de las llamadas a herramientas
               for (const pattern of toolPatterns) {
                  content = content.replace(pattern, '').trim();
               }
               // Limpiar marcadores adicionales
               content = content.replace(/<\|python_end\|>/g, '').trim();

               if (!content) {
                  content = '';
               }
            }
         }

         // 7. Procesar tool calls de manera SILENCIOSA si existen y el modelo los soporta
         const allToolCalls = [...(message?.tool_calls || []), ...detectedToolCalls];

         if (supportsTools && allToolCalls.length > 0) {
            console.log(
               `🔧 Procesando ${allToolCalls.length} herramientas de manera silenciosa...`
            );

            // Ejecutar herramientas pero NO agregar sus resultados al historial de conversación
            let toolContext = '';
            for (const toolCall of allToolCalls) {
               const toolResult = await executeToolCall(toolCall, conversationId);
               const functionName = 'function' in toolCall ? toolCall.function.name : 'desconocida';
               toolsUsed.push(functionName);

               // Solo loggear en consola, no exponer al usuario
               console.log(`✅ Herramienta ${functionName} ejecutada silenciosamente`);

               // Compilar contexto interno para el modelo
               if (toolResult && !toolResult.silent) {
                  toolContext += `Resultado de ${functionName}: ${JSON.stringify(toolResult)}\n`;
               } else if (toolResult && toolResult.results && toolResult.results.length > 0) {
                  // Para recallUserInfo, extraer la información útil
                  const relevantInfo = toolResult.results
                     .slice(0, 3)
                     .map((r: any) => r.data?.message || r.metadata?.message || r.content?.resource)
                     .filter(Boolean);
                  if (relevantInfo.length > 0) {
                     toolContext += `Información encontrada: ${relevantInfo.join('. ')}\n`;
                  }
               }
            }

            // Si el contenido del mensaje inicial está vacío O contiene tool calls en texto, generar respuesta natural
            if (!content || content.trim() === '' || detectedToolCalls.length > 0) {
               console.log('🔄 Generando respuesta natural después de ejecutar herramientas...');

               // Crear un prompt para generar una respuesta natural
               const responsePrompt = `The user said: "${prompt}"

You have processed this information ${toolsUsed.includes('storeUserInfo') ? 'and stored it for future reference' : ''}${toolsUsed.includes('recallUserInfo') ? 'and recalled relevant information' : ''}.

Respond naturally to the user in Spanish without mentioning tools, storage, or memory operations. Just have a natural conversation.`;

               // Añadir el contexto de herramientas al historial temporalmente
               const messagesWithToolContext = [
                  ...openaiMessages.slice(0, -1), // Todos menos el último mensaje del usuario
                  {
                     role: 'system' as const,
                     content: responsePrompt,
                  },
                  {
                     role: 'user' as const,
                     content: prompt,
                  },
               ];

               if (toolContext.trim()) {
                  messagesWithToolContext.splice(-1, 0, {
                     role: 'system' as const,
                     content: `Internal context (do not mention explicitly): ${toolContext.trim()}`,
                  });
               }

               // Segunda llamada al modelo sin herramientas para respuesta natural
               const followUpResponse = await client.chat.completions.create({
                  model: selectedModel.name,
                  messages: messagesWithToolContext,
                  max_completion_tokens: selectedModel.maxTokens,
                  prompt_cache_key: conversationId + '_followup',
               });

               content =
                  followUpResponse.choices[0]?.message?.content ||
                  '¡Entendido! Tendré eso en cuenta.';
               console.log('✅ Respuesta natural generada');
            }

            // Almacenar la respuesta final
            await conversationRepository.addMessage(conversationId, {
               role: MessageRole.ASSISTANT,
               content,
            });

            return {
               id: response.id,
               message: content,
               modelUsed: selectedModel.name,
               toolsUsed, // Para logging interno
               conversationId,
               images: images.length > 0 ? images : undefined,
            };
         } else {
            // Sin tool calls, respuesta normal
            await conversationRepository.addMessage(conversationId, {
               role: MessageRole.ASSISTANT,
               content,
            });

            return {
               id: response.id,
               message: content,
               modelUsed: selectedModel.name,
               toolsUsed,
               conversationId,
               images: images.length > 0 ? images : undefined,
            };
         }
      } catch (error: any) {
         console.error('❌ Error en chat service:', error);

         // Handle specific OpenAI/OpenRouter errors
         if (error && typeof error === 'object') {
            // Rate limit error (429)
            if (error.status === 429 || error.code === 429) {
               throw {
                  code: 'RATE_LIMIT_EXCEEDED',
                  message:
                     'Se ha excedido el límite de solicitudes. Intenta de nuevo en unos minutos.',
                  details: {
                     provider: 'OpenRouter',
                     status: 429,
                     retryAfter: '60 segundos',
                     suggestion: 'Reduce la frecuencia de solicitudes o actualiza tu plan',
                  },
                  timestamp: new Date(),
               };
            }

            // Model not available (503)
            if (error.status === 503) {
               throw {
                  code: 'MODEL_NOT_AVAILABLE',
                  message:
                     'El modelo de IA no está disponible temporalmente. Intenta con otro modelo.',
                  details: {
                     provider: 'OpenRouter',
                     status: 503,
                     modelUsed: request.modelType || 'unknown',
                  },
                  timestamp: new Date(),
               };
            }

            // Authentication error (401)
            if (error.status === 401) {
               throw {
                  code: 'AUTHENTICATION_ERROR',
                  message: 'Error de autenticación con el proveedor de IA. Verifica tu API key.',
                  details: {
                     provider: 'OpenRouter',
                     status: 401,
                  },
                  timestamp: new Date(),
               };
            }

            // Other API errors
            if (error.status) {
               throw {
                  code: 'EXTERNAL_API_ERROR',
                  message: `Error del proveedor de IA: ${error.message || 'Error desconocido'}`,
                  details: {
                     provider: 'OpenRouter',
                     status: error.status,
                     originalError: error.message || 'No message available',
                  },
                  timestamp: new Date(),
               };
            }
         }

         // Generic error fallback
         throw {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Error interno del servidor durante el procesamiento de IA',
            details: {
               originalError: error?.message || String(error),
            },
            timestamp: new Date(),
         };
      }
   },
};
