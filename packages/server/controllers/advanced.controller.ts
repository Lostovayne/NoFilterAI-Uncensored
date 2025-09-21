import type { Request, Response } from 'express';
import { z } from 'zod';
import { chatService } from '../services/chat.service';
import { geminiService } from '../services/gemini.service';
import type { AppError } from '../types/model.types';
import { ErrorCode, ModelType, TaskType } from '../types/model.types';

// ===== VALIDATION SCHEMAS =====
const geminiRequestSchema = z.object({
   prompt: z
      .string()
      .trim()
      .min(1, 'Prompt es requerido')
      .max(4000, 'Prompt demasiado largo (máximo 4000 caracteres)'),
   conversationId: z.string().uuid('Formato de ID de conversación inválido'),
   taskType: z.nativeEnum(TaskType).optional().default(TaskType.CHAT),
   useMemory: z.boolean().optional().default(true),
   useKnowledgeBase: z.boolean().optional().default(true),
   maxTokens: z.number().int().min(1).max(8192).optional().default(4096),
   temperature: z.number().min(0).max(2).optional().default(0.8),
   topK: z.number().int().min(1).max(40).optional().default(30),
   topP: z.number().min(0).max(1).optional().default(0.9),
   safetyLevel: z.enum(['none', 'low', 'medium', 'high']).optional().default('none'),
});

const uncensoredRequestSchema = z.object({
   prompt: z
      .string()
      .trim()
      .min(1, 'Prompt es requerido')
      .max(2000, 'Prompt demasiado largo (máximo 2000 caracteres)'),
   conversationId: z.string().uuid('Formato de ID de conversación inválido'),
   maxTokens: z.number().int().min(1).max(4096).optional().default(2048),
   temperature: z.number().min(0).max(2).optional().default(0.9),
});

const imageGenerationSchema = z.object({
   prompt: z
      .string()
      .trim()
      .min(1, 'Prompt para imagen es requerido')
      .max(1000, 'Prompt demasiado largo (máximo 1000 caracteres)'),
   conversationId: z.string().uuid('Formato de ID de conversación inválido'),
   style: z
      .enum(['photorealistic', 'artistic', 'cartoon', 'abstract'])
      .optional()
      .default('photorealistic'),
   quality: z.enum(['standard', 'high']).optional().default('high'),
   aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3']).optional().default('1:1'),
});

// ===== ERROR HANDLING =====
class ControllerError extends Error {
   constructor(
      public readonly appError: AppError,
      public readonly statusCode: number = 500
   ) {
      super(appError.message);
      this.name = 'ControllerError';
   }
}

const createValidationError = (zodError: z.ZodError): ControllerError => {
   const appError: AppError = {
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Validación de solicitud falló',
      details: {
         issues: zodError.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
         })),
      },
      timestamp: new Date(),
   };
   return new ControllerError(appError, 400);
};

const createInternalError = (originalError: unknown): ControllerError => {
   const appError: AppError = {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: 'Error interno del servidor',
      details: {
         originalError:
            originalError instanceof Error ? originalError.message : String(originalError),
      },
      timestamp: new Date(),
   };
   return new ControllerError(appError, 500);
};

const isAppError = (error: unknown): error is AppError => {
   return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'message' in error &&
      'timestamp' in error
   );
};

const getStatusCodeForError = (errorCode: ErrorCode): number => {
   switch (errorCode) {
      case ErrorCode.VALIDATION_ERROR:
         return 400;
      case ErrorCode.MODEL_NOT_FOUND:
      case ErrorCode.CONVERSATION_NOT_FOUND:
         return 404;
      case ErrorCode.RATE_LIMIT_EXCEEDED:
         return 429;
      case ErrorCode.EXTERNAL_API_ERROR:
         return 502;
      case ErrorCode.STORAGE_ERROR:
      case ErrorCode.INTERNAL_SERVER_ERROR:
      default:
         return 500;
   }
};

// ===== CONTROLADORES =====
class GeminiController {
   async getInfo(req: Request, res: Response): Promise<void> {
      res.json({
         message: 'Gemini 2.5 Pro API está funcionando',
         version: '2.0.0',
         capabilities: {
            chat: 'Conversación avanzada con herramientas',
            image_generation: 'Generación de imágenes',
            vision: 'Análisis de imágenes',
            audio: 'Procesamiento de audio',
            memory: 'Sistema de memoria persistente y temporal',
            knowledge_base: 'Base de conocimiento del usuario',
         },
         endpoints: {
            chat: 'POST /api/chat/gemini',
            image: 'POST /api/chat/gemini/image',
            health: 'GET /api/chat/gemini/health',
         },
      });
   }

   async sendMessage(req: Request, res: Response): Promise<void> {
      const startTime = Date.now();
      let requestId: string | undefined;

      try {
         console.log('📥 Gemini chat request recibida:', {
            timestamp: new Date().toISOString(),
            body: req.body,
         });

         // Validar request
         const parseResult = geminiRequestSchema.safeParse(req.body);
         if (!parseResult.success) {
            throw createValidationError(parseResult.error);
         }

         const validatedRequest = parseResult.data;
         console.log('✅ Request validada para Gemini:', validatedRequest);

         // Mapear a ChatRequest
         const serviceRequest = {
            prompt: validatedRequest.prompt,
            conversationId: validatedRequest.conversationId,
            modelType: ModelType.GEMINI,
            taskType: validatedRequest.taskType,
            useMemory: validatedRequest.useMemory,
            useKnowledgeBase: validatedRequest.useKnowledgeBase,
            maxTokens: validatedRequest.maxTokens,
            temperature: validatedRequest.temperature,
         };

         // Llamar al servicio de Gemini
         console.log('🚀 Llamando a Gemini service...');
         const serviceResponse = await geminiService.sendMessage(serviceRequest);
         requestId = serviceResponse.id;

         const processingTime = Date.now() - startTime;
         console.log('✅ Request de Gemini completada:', {
            requestId,
            processingTime: `${processingTime}ms`,
            modelUsed: serviceResponse.modelUsed,
            toolsUsed: serviceResponse.toolsUsed,
         });

         res.json({
            success: true,
            data: {
               ...serviceResponse,
               timestamp: new Date(),
            },
            meta: {
               processingTime,
               requestId,
               provider: 'Gemini 2.5 Pro',
            },
         });
      } catch (error) {
         const processingTime = Date.now() - startTime;
         this.handleError(error, res, processingTime, requestId);
      }
   }

   async generateImage(req: Request, res: Response): Promise<void> {
      const startTime = Date.now();
      let requestId: string | undefined;

      try {
         console.log('🎨 Gemini image generation request recibida:', req.body);

         const parseResult = imageGenerationSchema.safeParse(req.body);
         if (!parseResult.success) {
            throw createValidationError(parseResult.error);
         }

         const validatedRequest = parseResult.data;

         // Crear prompt mejorado para generación de imágenes
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
         requestId = serviceResponse.id;

         const processingTime = Date.now() - startTime;
         console.log('✅ Imagen generada exitosamente:', {
            requestId,
            processingTime: `${processingTime}ms`,
         });

         res.json({
            success: true,
            data: {
               ...serviceResponse,
               imageParams: {
                  style: validatedRequest.style,
                  quality: validatedRequest.quality,
                  aspectRatio: validatedRequest.aspectRatio,
               },
               timestamp: new Date(),
            },
            meta: {
               processingTime,
               requestId,
               provider: 'Gemini 2.5 Pro',
               type: 'image_generation',
            },
         });
      } catch (error) {
         const processingTime = Date.now() - startTime;
         this.handleError(error, res, processingTime, requestId);
      }
   }

   async healthCheck(req: Request, res: Response): Promise<void> {
      res.json({
         status: 'healthy',
         timestamp: new Date().toISOString(),
         version: '2.0.0',
         provider: 'Gemini 2.5 Pro',
         services: {
            gemini_api: 'connected',
            redis_storage: 'connected',
            upstash_search: 'connected',
            memory_tools: 'active',
            knowledge_base: 'active',
         },
         capabilities: {
            multimodal: true,
            tools: true,
            memory: true,
            vision: true,
            image_generation: true,
            audio_processing: true,
         },
      });
   }

   private handleError(
      error: unknown,
      res: Response,
      processingTime: number,
      requestId?: string
   ): void {
      if (error instanceof ControllerError) {
         console.error('❌ Gemini controller error:', {
            requestId,
            processingTime: `${processingTime}ms`,
            error: error.appError,
         });

         res.status(error.statusCode).json({
            success: false,
            error: error.appError,
            meta: {
               processingTime,
               requestId,
               provider: 'Gemini 2.5 Pro',
            },
         });
      } else if (isAppError(error)) {
         const statusCode = getStatusCodeForError(error.code);
         console.error('❌ Gemini service error:', {
            requestId,
            processingTime: `${processingTime}ms`,
            error,
         });

         res.status(statusCode).json({
            success: false,
            error,
            meta: {
               processingTime,
               requestId,
               provider: 'Gemini 2.5 Pro',
            },
         });
      } else {
         const controllerError = createInternalError(error);
         console.error('❌ Gemini unexpected error:', {
            requestId,
            processingTime: `${processingTime}ms`,
            error: controllerError.appError,
            originalError: error,
         });

         res.status(500).json({
            success: false,
            error: controllerError.appError,
            meta: {
               processingTime,
               requestId,
               provider: 'Gemini 2.5 Pro',
            },
         });
      }
   }
}

class UncensoredController {
   async getInfo(req: Request, res: Response): Promise<void> {
      res.json({
         message: 'Chat sin censura está funcionando',
         version: '2.0.0',
         model: 'Dolphin Mistral 24B Venice Edition',
         capabilities: {
            uncensored_chat: true,
            streaming: true,
            no_tools: true,
         },
         endpoints: {
            chat: 'POST /api/chat/uncensored',
            health: 'GET /api/chat/uncensored/health',
         },
      });
   }

   async sendMessage(req: Request, res: Response): Promise<void> {
      const startTime = Date.now();
      let requestId: string | undefined;

      try {
         console.log('📥 Uncensored chat request recibida:', {
            timestamp: new Date().toISOString(),
            body: req.body,
         });

         // Validar request
         const parseResult = uncensoredRequestSchema.safeParse(req.body);
         if (!parseResult.success) {
            throw createValidationError(parseResult.error);
         }

         const validatedRequest = parseResult.data;
         console.log('✅ Request validada para chat sin censura:', validatedRequest);

         // Mapear a ChatRequest
         const serviceRequest = {
            prompt: validatedRequest.prompt,
            conversationId: validatedRequest.conversationId,
            modelType: ModelType.UNCENSORED,
            taskType: TaskType.CHAT,
            useMemory: false,
            useKnowledgeBase: false,
            maxTokens: validatedRequest.maxTokens,
            temperature: validatedRequest.temperature,
         };

         // Usar el servicio de chat existente para el modelo sin censura
         console.log('🚀 Llamando al modelo sin censura...');
         const serviceResponse = await chatService.sendMessage(serviceRequest);
         requestId = serviceResponse.id;

         const processingTime = Date.now() - startTime;
         console.log('✅ Request sin censura completada:', {
            requestId,
            processingTime: `${processingTime}ms`,
            modelUsed: serviceResponse.modelUsed,
         });

         res.json({
            success: true,
            data: {
               ...serviceResponse,
               timestamp: new Date(),
            },
            meta: {
               processingTime,
               requestId,
               provider: 'OpenRouter (Sin censura)',
               model: 'Dolphin Mistral 24B',
            },
         });
      } catch (error) {
         const processingTime = Date.now() - startTime;
         this.handleError(error, res, processingTime, requestId);
      }
   }

   async healthCheck(req: Request, res: Response): Promise<void> {
      res.json({
         status: 'healthy',
         timestamp: new Date().toISOString(),
         version: '2.0.0',
         provider: 'OpenRouter',
         model: 'Dolphin Mistral 24B Venice Edition',
         services: {
            openrouter_api: 'connected',
            uncensored_mode: 'active',
         },
         capabilities: {
            uncensored_chat: true,
            streaming: true,
            no_content_filtering: true,
         },
      });
   }

   private handleError(
      error: unknown,
      res: Response,
      processingTime: number,
      requestId?: string
   ): void {
      if (error instanceof ControllerError) {
         console.error('❌ Uncensored controller error:', {
            requestId,
            processingTime: `${processingTime}ms`,
            error: error.appError,
         });

         res.status(error.statusCode).json({
            success: false,
            error: error.appError,
            meta: {
               processingTime,
               requestId,
               provider: 'OpenRouter (Sin censura)',
            },
         });
      } else if (isAppError(error)) {
         const statusCode = getStatusCodeForError(error.code);
         console.error('❌ Uncensored service error:', {
            requestId,
            processingTime: `${processingTime}ms`,
            error,
         });

         res.status(statusCode).json({
            success: false,
            error,
            meta: {
               processingTime,
               requestId,
               provider: 'OpenRouter (Sin censura)',
            },
         });
      } else {
         const controllerError = createInternalError(error);
         console.error('❌ Uncensored unexpected error:', {
            requestId,
            processingTime: `${processingTime}ms`,
            error: controllerError.appError,
            originalError: error,
         });

         res.status(500).json({
            success: false,
            error: controllerError.appError,
            meta: {
               processingTime,
               requestId,
               provider: 'OpenRouter (Sin censura)',
            },
         });
      }
   }
}

export const geminiController = new GeminiController();
export const uncensoredController = new UncensoredController();
export { GeminiController, UncensoredController };
