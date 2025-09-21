import { GoogleGenAI } from '@google/genai';
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

// Directorio para guardar imágenes generadas
const IMAGES_DIR = path.join(process.cwd(), 'generated-images');
if (!fs.existsSync(IMAGES_DIR)) {
   fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Servicio principal de Gemini optimizado
export const geminiService = {
   // Chat inteligente
   async sendMessage(request: ChatRequest): Promise<ChatResponse> {
      try {
         console.log('🚀 Iniciando chat con Gemini 2.5 Pro:', {
            taskType: request.taskType,
         });

         const { prompt, conversationId, taskType } = request;

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

         // Almacenar mensaje del usuario
         await conversationRepository.addMessage(conversationId, {
            role: MessageRole.USER,
            content: prompt,
         });

         console.log('💬 Enviando mensaje a Gemini...');
         const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
         });

         const content = response.candidates?.[0]?.content?.parts?.[0]?.text || 'Sin respuesta';

         // Almacenar respuesta del asistente
         await conversationRepository.addMessage(conversationId, {
            role: MessageRole.ASSISTANT,
            content,
         });

         return {
            id: crypto.SHA256(conversationId + Date.now()).toString(),
            message: content,
            modelUsed: modelName,
            toolsUsed: [],
            conversationId,
            usage: {
               promptTokens: prompt.length / 4, // Estimación
               completionTokens: content.length / 4,
               totalTokens: (prompt.length + content.length) / 4,
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
               } else if (part.inlineData?.data) {
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
};
