import type { Request, Response } from 'express';
import { z } from 'zod';
import { chatService } from '../services/chat.service';
import { geminiService } from '../services/gemini.service';
import { ModelType, TaskType } from '../types/model.types';

// ===== VALIDATION SCHEMAS =====
const geminiRequestSchema = z.object({
   prompt: z.string().trim().min(1, 'Prompt es requerido'),
   conversationId: z.string().min(1, 'ConversationId es requerido'),
   taskType: z.nativeEnum(TaskType).optional().default(TaskType.CHAT),
   useKnowledgeBase: z.boolean().optional().default(true),
   maxTokens: z.number().int().min(1).max(8192).optional().default(4096),
   temperature: z.number().min(0).max(2).optional().default(0.8),
});

const imageGenerationSchema = z.object({
   prompt: z.string().trim().min(1, 'Prompt para imagen es requerido'),
   conversationId: z.string().min(1, 'ConversationId es requerido'),
   style: z
      .enum(['photorealistic', 'artistic', 'cartoon', 'abstract'])
      .optional()
      .default('photorealistic'),
   quality: z.enum(['standard', 'high']).optional().default('high'),
   aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3']).optional().default('1:1'),
});

const uncensoredRequestSchema = z.object({
   prompt: z.string().trim().min(1, 'Prompt es requerido'),
   conversationId: z.string().min(1, 'ConversationId es requerido'),
   maxTokens: z.number().int().min(1).max(4096).optional().default(2048),
   temperature: z.number().min(0).max(2).optional().default(0.9),
});

// ===== CONTROLADORES =====
export class GeminiController {
   static async sendMessage(req: Request, res: Response): Promise<void> {
      const startTime = Date.now();

      try {
         console.log('📥 Gemini chat request recibida:', req.body);

         // Validar request
         const parseResult = geminiRequestSchema.safeParse(req.body);
         if (!parseResult.success) {
            return res.status(400).json({
               success: false,
               error: `Validación falló: ${parseResult.error.errors.map((e) => e.message).join(', ')}`,
               timestamp: new Date().toISOString(),
            });
         }

         const validatedRequest = parseResult.data;
         console.log('✅ Request validada para Gemini:', validatedRequest);

         // Llamar al servicio de Gemini
         const serviceResponse = await geminiService.sendMessage(validatedRequest);

         const processingTime = Date.now() - startTime;
         console.log('✅ Request de Gemini completada:', {
            processingTime: `${processingTime}ms`,
            modelUsed: serviceResponse.modelUsed,
         });

         res.json({
            success: true,
            data: serviceResponse,
            meta: {
               processingTime,
               provider: 'Gemini 2.5 Pro',
            },
         });
      } catch (error) {
         const processingTime = Date.now() - startTime;
         console.error('❌ Gemini controller error:', error);

         const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

         res.status(500).json({
            success: false,
            error: errorMessage,
            meta: {
               processingTime,
               provider: 'Gemini 2.5 Pro',
            },
         });
      }
   }

   static async generateImage(req: Request, res: Response): Promise<void> {
      const startTime = Date.now();

      try {
         console.log('🎨 Gemini image generation request recibida:', req.body);

         const parseResult = imageGenerationSchema.safeParse(req.body);
         if (!parseResult.success) {
            return res.status(400).json({
               success: false,
               error: `Validación falló: ${parseResult.error.errors.map((e) => e.message).join(', ')}`,
               timestamp: new Date().toISOString(),
            });
         }

         const validatedRequest = parseResult.data;

         // Crear opciones para la imagen
         const imageOptions = {
            style: validatedRequest.style,
            quality: validatedRequest.quality,
            aspectRatio: validatedRequest.aspectRatio,
         };

         console.log('🚀 Generando imagen con Gemini...');
         const serviceResponse = await geminiService.generateImage(
            validatedRequest.prompt,
            validatedRequest.conversationId,
            imageOptions
         );

         const processingTime = Date.now() - startTime;
         console.log('✅ Imagen generada exitosamente:', {
            processingTime: `${processingTime}ms`,
            hasImages: !!serviceResponse.images,
         });

         res.json({
            success: true,
            data: serviceResponse,
            meta: {
               processingTime,
               provider: 'Gemini Image Preview',
               type: 'image_generation',
            },
         });
      } catch (error) {
         const processingTime = Date.now() - startTime;
         console.error('❌ Gemini image error:', error);

         const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

         res.status(500).json({
            success: false,
            error: errorMessage,
            meta: {
               processingTime,
               provider: 'Gemini Image Preview',
            },
         });
      }
   }
}

export class UncensoredController {
   static async sendMessage(req: Request, res: Response): Promise<void> {
      const startTime = Date.now();

      try {
         console.log('📥 Uncensored chat request recibida:', req.body);

         // Validar request
         const parseResult = uncensoredRequestSchema.safeParse(req.body);
         if (!parseResult.success) {
            return res.status(400).json({
               success: false,
               error: `Validación falló: ${parseResult.error.errors.map((e) => e.message).join(', ')}`,
               timestamp: new Date().toISOString(),
            });
         }

         const validatedRequest = parseResult.data;

         // Mapear a ChatRequest
         const serviceRequest = {
            prompt: validatedRequest.prompt,
            conversationId: validatedRequest.conversationId,
            modelType: ModelType.UNCENSORED,
            taskType: TaskType.CHAT,
            maxTokens: validatedRequest.maxTokens,
            temperature: validatedRequest.temperature,
         };

         // Usar el servicio de chat para el modelo sin censura
         console.log('🚀 Llamando al modelo sin censura...');
         const serviceResponse = await chatService.sendMessage(serviceRequest);

         const processingTime = Date.now() - startTime;
         console.log('✅ Request sin censura completada:', {
            processingTime: `${processingTime}ms`,
            modelUsed: serviceResponse.modelUsed,
         });

         res.json({
            success: true,
            data: serviceResponse,
            meta: {
               processingTime,
               provider: 'OpenRouter (Sin censura)',
               model: 'Dolphin Mistral 24B',
            },
         });
      } catch (error) {
         const processingTime = Date.now() - startTime;
         console.error('❌ Uncensored controller error:', error);

         const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

         res.status(500).json({
            success: false,
            error: errorMessage,
            meta: {
               processingTime,
               provider: 'OpenRouter (Sin censura)',
            },
         });
      }
   }
}
