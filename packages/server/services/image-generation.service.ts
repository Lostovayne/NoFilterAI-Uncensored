import * as crypto from 'crypto-js';
import OpenAI from 'openai';
import { conversationRepository } from '../repositories/conversation.repository';
import type { ChatResponse } from '../types/model.types';
import { MessageRole } from '../types/model.types';

// Cliente OpenAI para DALL-E (generación real de imágenes)
const openai = new OpenAI({
   apiKey: process.env.OPENAI_API_KEY,
});

export const imageGenerationService = {
   async generateWithDALLE(
      prompt: string,
      conversationId: string,
      options: {
         style?: 'photorealistic' | 'artistic' | 'cartoon' | 'abstract';
         quality?: 'standard' | 'high';
         aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3';
      } = {}
   ): Promise<ChatResponse> {
      try {
         console.log('🎨 Generando imagen real con DALL-E 3...');

         // Mapear estilo a prompts más específicos
         let enhancedPrompt = prompt;

         switch (options.style) {
            case 'photorealistic':
               enhancedPrompt = `Photorealistic, high-quality, detailed: ${prompt}`;
               break;
            case 'artistic':
               enhancedPrompt = `Artistic, painterly style, creative interpretation: ${prompt}`;
               break;
            case 'cartoon':
               enhancedPrompt = `Cartoon style, animated, colorful, fun: ${prompt}`;
               break;
            case 'abstract':
               enhancedPrompt = `Abstract art, conceptual, modern: ${prompt}`;
               break;
         }

         // Mapear aspect ratio a size
         let size: '1024x1024' | '1792x1024' | '1024x1792' = '1024x1024';

         switch (options.aspectRatio) {
            case '16:9':
               size = '1792x1024';
               break;
            case '9:16':
               size = '1024x1792';
               break;
            case '4:3':
            case '1:1':
            default:
               size = '1024x1024';
               break;
         }

         const response = await openai.images.generate({
            model: 'dall-e-3',
            prompt: enhancedPrompt,
            n: 1,
            size: size,
            quality: options.quality === 'high' ? 'hd' : 'standard',
            response_format: 'url',
         });

         const imageUrl = response.data[0]?.url;
         const revisedPrompt = response.data[0]?.revised_prompt;

         if (!imageUrl) {
            throw new Error('No se pudo generar la imagen');
         }

         // Almacenar en conversación
         await conversationRepository.addMessage(conversationId, {
            role: MessageRole.USER,
            content: `Generar imagen: ${prompt}`,
         });

         await conversationRepository.addMessage(conversationId, {
            role: MessageRole.ASSISTANT,
            content: `✅ Imagen generada exitosamente con DALL-E 3\n🖼️ URL: ${imageUrl}\n📝 Prompt optimizado: ${revisedPrompt || enhancedPrompt}`,
         });

         return {
            id: crypto.SHA256(conversationId + Date.now()).toString(),
            message: `✅ **Imagen Generada Exitosamente**\n\n🖼️ **URL de la imagen:** ${imageUrl}\n\n📝 **Prompt usado:** ${revisedPrompt || enhancedPrompt}\n\n🎯 **Prompt original:** ${prompt}`,
            modelUsed: 'dall-e-3',
            toolsUsed: ['real_image_generation'],
            conversationId,
            images: [
               {
                  type: 'image',
                  imageUrl: { url: imageUrl },
                  metadata: {
                     format: 'url',
                     size: size,
                     quality: options.quality || 'standard',
                     style: options.style || 'photorealistic',
                     prompt: enhancedPrompt,
                     revisedPrompt: revisedPrompt,
                  },
               },
            ],
            usage: {
               promptTokens: enhancedPrompt.length / 4, // Estimación
               completionTokens: 0,
               totalTokens: enhancedPrompt.length / 4,
            },
         };
      } catch (error: unknown) {
         console.error('❌ Error generando imagen con DALL-E:', error);

         const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

         throw {
            code: 'IMAGE_GENERATION_ERROR',
            message: `Error generando imagen real: ${errorMessage}`,
            details: {
               provider: 'OpenAI DALL-E 3',
               originalError: errorMessage,
               suggestion:
                  'Verifica tu API key de OpenAI o usa el endpoint de Gemini para prompts optimizados',
            },
            timestamp: new Date(),
         };
      }
   },

   async generateWithStableDiffusion(
      prompt: string,
      conversationId: string
   ): Promise<ChatResponse> {
      // Placeholder para integración futura con Stable Diffusion
      console.log('🎨 Stable Diffusion no implementado aún');

      return {
         id: crypto.SHA256(conversationId + Date.now()).toString(),
         message: `🚧 **Stable Diffusion en desarrollo**\n\nPor ahora, usa:\n- **DALL-E 3** para imágenes reales\n- **Gemini** para prompts optimizados\n\nPrompt solicitado: ${prompt}`,
         modelUsed: 'stable-diffusion-placeholder',
         toolsUsed: ['placeholder'],
         conversationId,
      };
   },
};
