import { GoogleGenAI } from '@google/genai';
import { Redis } from '@upstash/redis';
import { Search } from '@upstash/search';
import * as crypto from 'crypto-js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { conversationRepository } from '../repositories/conversation.repository';
import type { ChatRequest, ChatResponse } from '../types/model.types';
import { MessageRole, TaskType } from '../types/model.types';

// Configuración de GoogleGenAI
const ai = new GoogleGenAI({
   apiKey: process.env.GEMINI_API_KEY,
});

// Configuración de Redis para chats temporales
const redis = new Redis({
   url: process.env.UPSTASH_REDIS_REST_URL,
   token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Configuración de Upstash Search para conocimiento persistente
let searchClient: Search | null = null;
let knowledgeIndex: any = null;

try {
   searchClient = new Search({
      url: process.env.UPSTASH_SEARCH_REST_URL,
      token: process.env.UPSTASH_SEARCH_REST_TOKEN,
   });
   knowledgeIndex = searchClient.index('user-knowledge');
   console.log('✅ Upstash Search inicializado correctamente');
} catch (error: unknown) {
   console.warn(
      '⚠️ Upstash Search no disponible:',
      error instanceof Error ? error.message : 'Error desconocido'
   );
}

// Implementación de herramientas de memoria
async function storeUserInfo(
   info: string,
   category: string = 'general'
): Promise<{ success: boolean; message: string }> {
   try {
      if (!knowledgeIndex) {
         console.warn('🚨 Sistema de conocimiento no disponible');
         return { success: false, message: 'Sistema de memoria no disponible' };
      }

      console.log(`💾 Almacenando información del usuario [${category}]:`, info.substring(0, 100));

      const id = crypto.SHA256(info + category).toString();
      const timestamp = new Date().toISOString();

      const dataToStore = {
         id,
         content: info,
         metadata: {
            category,
            timestamp,
            type: 'user_knowledge',
            source: 'gemini_conversation',
         },
      };

      await knowledgeIndex.upsert(dataToStore);
      console.log('✅ Información almacenada en base de conocimiento');

      return { success: true, message: 'Información almacenada correctamente' };
   } catch (error) {
      console.error('❌ Error al almacenar información del usuario:', error);
      return { success: false, message: 'Error al almacenar información' };
   }
}

async function recallUserInfo(query: string): Promise<{
   results: Array<{ content: string; category: string; timestamp: string; score: number }>;
   count: number;
   message?: string;
}> {
   try {
      if (!knowledgeIndex) {
         console.warn('🚨 Sistema de conocimiento no disponible');
         return { results: [], count: 0, message: 'Sistema de memoria no disponible' };
      }

      console.log('🔍 Buscando información del usuario:', query);

      const searchResult = await knowledgeIndex.search({
         query,
         topK: 5,
         filter: { metadata: { type: 'user_knowledge' } },
      });

      const results = searchResult?.results || [];
      console.log(`📊 Encontrados ${results.length} resultados`);

      const formattedResults = results.map(
         (result: {
            content: string;
            metadata?: { category?: string; timestamp?: string };
            score?: number;
         }) => ({
            content: result.content,
            category: result.metadata?.category || 'general',
            timestamp: result.metadata?.timestamp || '',
            score: result.score || 0,
         })
      );

      return { results: formattedResults, count: results.length };
   } catch (error) {
      console.error('❌ Error al buscar información del usuario:', error);
      return { results: [], count: 0, message: 'Error al buscar información' };
   }
}

async function storeTempData(
   key: string,
   data: string
): Promise<{ success: boolean; message: string }> {
   try {
      const prefixedKey = `temp:${key}`;
      await redis.setex(prefixedKey, 86400, data); // 24 horas = 86400 segundos
      console.log(`💾 Datos temporales almacenados: ${key}`);
      return { success: true, message: 'Datos temporales almacenados (24h)' };
   } catch (error) {
      console.error('❌ Error al almacenar datos temporales:', error);
      return { success: false, message: 'Error al almacenar datos temporales' };
   }
}

async function getTempData(
   key: string
): Promise<{ success: boolean; data?: string; message: string }> {
   try {
      const prefixedKey = `temp:${key}`;
      const data = await redis.get(prefixedKey);

      if (data) {
         console.log(`📦 Datos temporales recuperados: ${key}`);
         return { success: true, data: data as string, message: 'Datos encontrados' };
      } else {
         console.log(`🔍 No se encontraron datos temporales: ${key}`);
         return { success: false, message: 'Datos no encontrados o expirados' };
      }
   } catch (error) {
      console.error('❌ Error al recuperar datos temporales:', error);
      return { success: false, message: 'Error al recuperar datos temporales' };
   }
}

// Directorio para guardar imágenes generadas
const IMAGES_DIR = path.join(process.cwd(), 'generated-images');
if (!fs.existsSync(IMAGES_DIR)) {
   fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Servicio principal de Gemini optimizado
export const geminiService = {
   // Chat inteligente con herramientas
   async sendMessage(request: ChatRequest): Promise<ChatResponse> {
      try {
         console.log('🚀 Iniciando chat con Gemini 2.5 Pro:', {
            taskType: request.taskType,
            useKnowledgeBase: request.useKnowledgeBase,
         });

         const { prompt, conversationId, taskType, useKnowledgeBase } = request;

         // Seleccionar modelo según la tarea
         let modelName = 'gemini-2.5-flash-lite'; // Por defecto el más económico

         switch (taskType) {
            case TaskType.VISION:
               modelName = 'gemini-2.5-flash';
               break;
            case TaskType.AUDIO:
            case TaskType.TEXT_TO_SPEECH:
            case TaskType.SPEECH_TO_TEXT:
               modelName = 'gemini-2.5-flash-preview-tts';
               break;
            case TaskType.CHAT:
            default:
               modelName = 'gemini-2.5-flash-lite';
               break;
         }

         console.log(`🤖 Usando modelo: ${modelName}`);

         // Buscar información relevante del usuario automáticamente
         let contextInfo = '';
         if (useKnowledgeBase && knowledgeIndex) {
            try {
               const userInfo = await recallUserInfo(
                  `contexto relevante para: ${prompt.substring(0, 50)}`
               );
               if (userInfo.results && userInfo.results.length > 0) {
                  contextInfo = userInfo.results
                     .slice(0, 2)
                     .map((r: { content: string }) => r.content)
                     .join('. ');
                  console.log('✅ Contexto del usuario cargado');
               }
            } catch (error) {
               console.log('⚠️ Error al cargar contexto del usuario:', error);
            }
         }

         // Preparar prompt con contexto
         let finalPrompt = prompt;
         if (contextInfo) {
            finalPrompt = `Contexto previo del usuario: ${contextInfo}\n\nUsuario actual: ${prompt}`;
         }

         // Almacenar mensaje del usuario
         await conversationRepository.addMessage(conversationId, {
            role: MessageRole.USER,
            content: prompt,
         });

         // También almacenar en Redis (temporal)
         const redisKey = `chat:${conversationId}:${Date.now()}`;
         await redis.setex(
            redisKey,
            86400,
            JSON.stringify({
               role: 'user',
               content: prompt,
               timestamp: new Date().toISOString(),
            })
         );

         console.log('💬 Enviando mensaje a Gemini...');
         const response = await ai.models.generateContent({
            model: modelName,
            contents: finalPrompt,
         });

         const content = response.candidates?.[0]?.content?.parts?.[0]?.text || 'Sin respuesta';
         const toolsUsed: string[] = [];

         // Si el usuario compartió información personal, almacenarla automáticamente
         if (useKnowledgeBase && this.detectsPersonalInfo(prompt)) {
            try {
               await storeUserInfo(prompt, 'conversacion_automatica');
               toolsUsed.push('auto_memory_storage');
               console.log('💾 Información personal detectada y almacenada automáticamente');
            } catch (error) {
               console.log('⚠️ Error al almacenar información automáticamente:', error);
            }
         }

         // Almacenar respuesta del asistente
         await conversationRepository.addMessage(conversationId, {
            role: MessageRole.ASSISTANT,
            content,
         });

         // También almacenar en Redis (temporal)
         const responseRedisKey = `chat:${conversationId}:${Date.now() + 1}`;
         await redis.setex(
            responseRedisKey,
            86400,
            JSON.stringify({
               role: 'assistant',
               content,
               timestamp: new Date().toISOString(),
               toolsUsed,
            })
         );

         return {
            id: crypto.SHA256(conversationId + Date.now()).toString(),
            message: content,
            modelUsed: modelName,
            toolsUsed,
            conversationId,
            usage: {
               promptTokens: finalPrompt.length / 4, // Estimación
               completionTokens: content.length / 4,
               totalTokens: (finalPrompt.length + content.length) / 4,
            },
         };
      } catch (error: unknown) {
         console.error('❌ Error en Gemini service:', error);

         const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

         throw {
            code: 'GEMINI_API_ERROR',
            message: `Error de Gemini API: ${errorMessage}`,
            details: {
               provider: 'Gemini',
               originalError: errorMessage,
            },
            timestamp: new Date(),
         };
      }
   },

   // Generación REAL de imágenes con Gemini
   async generateImage(
      prompt: string,
      conversationId: string,
      options: {
         style?: string;
         quality?: string;
         aspectRatio?: string;
      } = {}
   ): Promise<ChatResponse> {
      try {
         console.log('🎨 Generando imagen REAL con Gemini 2.5 Flash Image Preview...');

         // Crear prompt mejorado según el estilo
         let enhancedPrompt = prompt;

         if (options.style === 'photorealistic') {
            enhancedPrompt = `Create a photorealistic, high-quality image: ${prompt}`;
         } else if (options.style === 'artistic') {
            enhancedPrompt = `Create an artistic, painterly style image: ${prompt}`;
         } else if (options.style === 'cartoon') {
            enhancedPrompt = `Create a cartoon style, animated, colorful image: ${prompt}`;
         } else if (options.style === 'abstract') {
            enhancedPrompt = `Create an abstract art, conceptual image: ${prompt}`;
         }

         console.log('📝 Prompt optimizado:', enhancedPrompt);

         const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: enhancedPrompt,
         });

         let imageUrl = null;
         let imageBuffer = null;
         let content = 'Imagen generada correctamente';

         // Procesar la respuesta para extraer la imagen
         if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
               if (part.text) {
                  content = part.text;
               } else if (part.inlineData) {
                  // Imagen encontrada como datos inline
                  imageBuffer = Buffer.from(part.inlineData.data, 'base64');

                  // Guardar imagen en el servidor
                  const filename = `gemini-image-${Date.now()}.png`;
                  const filepath = path.join(IMAGES_DIR, filename);
                  fs.writeFileSync(filepath, imageBuffer);

                  // Crear URL para acceder a la imagen
                  imageUrl = `/generated-images/${filename}`;
                  content = `✅ Imagen generada exitosamente: ${filename}`;

                  console.log(`🖼️ Imagen guardada en: ${filepath}`);
                  break;
               }
            }
         }

         // Almacenar en conversación
         await conversationRepository.addMessage(conversationId, {
            role: MessageRole.USER,
            content: `Generar imagen: ${prompt}`,
         });

         await conversationRepository.addMessage(conversationId, {
            role: MessageRole.ASSISTANT,
            content: imageUrl ? `Imagen generada: ${imageUrl}` : content,
         });

         const responseData: ChatResponse = {
            id: crypto.SHA256(conversationId + Date.now()).toString(),
            message: content,
            modelUsed: 'gemini-2.5-flash-image-preview',
            toolsUsed: ['native_image_generation'],
            conversationId,
            usage: {
               promptTokens: enhancedPrompt.length / 4,
               completionTokens: content.length / 4,
               totalTokens: (enhancedPrompt.length + content.length) / 4,
            },
         };

         // Agregar imagen si se generó
         if (imageUrl && imageBuffer) {
            responseData.images = [
               {
                  type: 'image',
                  imageUrl: { url: imageUrl },
                  metadata: {
                     format: 'png',
                     prompt: enhancedPrompt,
                     style: options.style || 'default',
                     size: `${imageBuffer.length} bytes`,
                  },
               },
            ];
         }

         return responseData;
      } catch (error: unknown) {
         console.error('❌ Error generando imagen con Gemini:', error);

         const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

         throw {
            code: 'IMAGE_GENERATION_ERROR',
            message: `Error generando imagen: ${errorMessage}`,
            details: { provider: 'Gemini Image Preview', originalError: errorMessage },
            timestamp: new Date(),
         };
      }
   },

   // Generación de audio con TTS
   async generateAudio(prompt: string, conversationId: string): Promise<ChatResponse> {
      try {
         console.log('🎵 Generando audio con Gemini TTS...');

         const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: `Convert this text to speech: ${prompt}`,
         });

         const content = response.candidates?.[0]?.content?.parts?.[0]?.text || 'Audio generado';

         // Almacenar en conversación
         await conversationRepository.addMessage(conversationId, {
            role: MessageRole.USER,
            content: `Generar audio: ${prompt}`,
         });

         await conversationRepository.addMessage(conversationId, {
            role: MessageRole.ASSISTANT,
            content,
         });

         return {
            id: crypto.SHA256(conversationId + Date.now()).toString(),
            message: content,
            modelUsed: 'gemini-2.5-flash-preview-tts',
            toolsUsed: ['audio_generation'],
            conversationId,
         };
      } catch (error: unknown) {
         console.error('❌ Error generando audio:', error);

         const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

         throw {
            code: 'AUDIO_GENERATION_ERROR',
            message: `Error generando audio: ${errorMessage}`,
            details: { provider: 'Gemini TTS', originalError: errorMessage },
            timestamp: new Date(),
         };
      }
   },

   // Generación de video
   async generateVideo(prompt: string, conversationId: string): Promise<ChatResponse> {
      try {
         console.log('🎬 Iniciando generación de video...');

         const operation = await ai.models.generateVideos({
            model: 'veo-3.0-generate-001',
            prompt: prompt,
         });

         // Polling hasta que el video esté listo
         let videoOperation = operation;
         let attempts = 0;
         const maxAttempts = 30; // 5 minutos máximo

         while (!videoOperation.done && attempts < maxAttempts) {
            console.log(`⏳ Generando video... Intento ${attempts + 1}/${maxAttempts}`);
            await new Promise((resolve) => setTimeout(resolve, 10000)); // 10 segundos

            videoOperation = await ai.operations.getVideosOperation({
               operation: videoOperation,
            });
            attempts++;
         }

         if (!videoOperation.done) {
            throw new Error('Timeout: La generación de video tomó demasiado tiempo');
         }

         // Descargar el video generado
         const filename = `gemini-video-${Date.now()}.mp4`;
         const downloadPath = path.join(IMAGES_DIR, filename);

         await ai.files.download({
            file: videoOperation.response.generatedVideos[0].video,
            downloadPath,
         });

         const videoUrl = `/generated-images/${filename}`;
         const content = `✅ Video generado exitosamente: ${filename}`;

         console.log(`🎬 Video guardado en: ${downloadPath}`);

         // Almacenar en conversación
         await conversationRepository.addMessage(conversationId, {
            role: MessageRole.USER,
            content: `Generar video: ${prompt}`,
         });

         await conversationRepository.addMessage(conversationId, {
            role: MessageRole.ASSISTANT,
            content: `Video generado: ${videoUrl}`,
         });

         return {
            id: crypto.SHA256(conversationId + Date.now()).toString(),
            message: content,
            modelUsed: 'veo-3.0-generate-001',
            toolsUsed: ['video_generation'],
            conversationId,
            images: [
               {
                  type: 'video',
                  imageUrl: { url: videoUrl },
                  metadata: {
                     format: 'mp4',
                     prompt: prompt,
                     processingTime: `${attempts * 10}s`,
                  },
               },
            ],
         };
      } catch (error: unknown) {
         console.error('❌ Error generando video:', error);

         const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

         throw {
            code: 'VIDEO_GENERATION_ERROR',
            message: `Error generando video: ${errorMessage}`,
            details: { provider: 'Veo 3.0', originalError: errorMessage },
            timestamp: new Date(),
         };
      }
   },

   // Detectar información personal en el prompt
   detectsPersonalInfo(prompt: string): boolean {
      const personalKeywords = [
         'me llamo',
         'mi nombre es',
         'soy',
         'trabajo en',
         'vivo en',
         'mi edad',
         'tengo',
         'me gusta',
         'prefiero',
         'odio',
         'mi trabajo',
         'mi familia',
         'mis hobbies',
         'mi casa',
      ];

      return personalKeywords.some((keyword) =>
         prompt.toLowerCase().includes(keyword.toLowerCase())
      );
   },

   // Limpiar datos temporales
   async cleanupTempData(): Promise<void> {
      try {
         console.log('🧹 Limpiando datos temporales...');
         console.log('✅ Limpieza automática configurada con Redis TTL');
      } catch (error) {
         console.error('❌ Error en limpieza de datos temporales:', error);
      }
   },
};
