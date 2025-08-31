import type { Request, Response } from 'express';
import { z } from 'zod';
import type { ChatRequestDTO, ChatResponseDTO, AppError } from '../types/model.types';
import { ModelType, TaskType, ErrorCode } from '../types/model.types';
import { chatService } from '../services/chat.service';

// ===== VALIDATION SCHEMAS =====
const chatRequestSchema = z.object({
   prompt: z
      .string()
      .trim()
      .min(1, 'Prompt is required')
      .max(2000, 'Prompt is too long (max 2000 characters)'),
   conversationId: z.string().uuid('Invalid conversation ID format'),
   modelType: z.nativeEnum(ModelType).optional().default(ModelType.SIMPLE),
   taskType: z.nativeEnum(TaskType).optional().default(TaskType.CHAT),
   useMemory: z.boolean().optional().default(false),
   useKnowledgeBase: z.boolean().optional().default(false),
   maxTokens: z.number().int().min(1).max(4000).optional(),
   temperature: z.number().min(0).max(2).optional(),
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
      message: 'Request validation failed',
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
      message: 'Internal server error occurred',
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

// ===== REQUEST/RESPONSE MAPPERS =====
const mapRequestDTOToServiceRequest = (dto: ChatRequestDTO) => {
   return {
      prompt: dto.prompt,
      conversationId: dto.conversationId,
      modelType: dto.modelType,
      taskType: dto.taskType,
      useMemory: dto.useMemory,
      useKnowledgeBase: dto.useKnowledgeBase,
      maxTokens: dto.maxTokens,
      temperature: dto.temperature,
   };
};

const mapServiceResponseToDTO = (serviceResponse: any): ChatResponseDTO => {
   return {
      id: serviceResponse.id,
      message: serviceResponse.message,
      modelUsed: serviceResponse.modelUsed,
      toolsUsed: serviceResponse.toolsUsed || [],
      conversationId: serviceResponse.conversationId,
      images: serviceResponse.images,
      timestamp: new Date(),
      usage: serviceResponse.usage,
   };
};

// ===== CONTROLLER IMPLEMENTATION =====
class ChatController {
   async getMessage(req: Request, res: Response): Promise<void> {
      res.json({
         message: 'Chat API is running',
         version: '2.0.0',
         endpoints: {
            chat: 'POST /api/chat',
            health: 'GET /api/chat/health',
         },
      });
   }

   async sendMessage(req: Request, res: Response): Promise<void> {
      const startTime = Date.now();
      let requestId: string | undefined;

      try {
         console.log('📥 Chat request received:', {
            timestamp: new Date().toISOString(),
            body: req.body,
         });

         // Validate request
         const parseResult = chatRequestSchema.safeParse(req.body);
         if (!parseResult.success) {
            throw createValidationError(parseResult.error);
         }

         const validatedRequest = parseResult.data;
         console.log('✅ Request validated:', validatedRequest);

         // Map DTO to service request
         const serviceRequest = mapRequestDTOToServiceRequest(validatedRequest);

         // Call service
         console.log('🚀 Calling chat service...');
         const serviceResponse = await chatService.sendMessage(serviceRequest);
         requestId = serviceResponse.id;

         // Map service response to DTO
         const responseDTO = mapServiceResponseToDTO(serviceResponse);

         const processingTime = Date.now() - startTime;
         console.log('✅ Request completed successfully:', {
            requestId,
            processingTime: `${processingTime}ms`,
            modelUsed: responseDTO.modelUsed,
            toolsUsed: responseDTO.toolsUsed,
         });

         res.json({
            success: true,
            data: responseDTO,
            meta: {
               processingTime,
               requestId,
            },
         });
      } catch (error) {
         const processingTime = Date.now() - startTime;

         if (error instanceof ControllerError) {
            console.error('❌ Controller error:', {
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
               },
            });
         } else if (isAppError(error)) {
            const statusCode = getStatusCodeForError(error.code);
            console.error('❌ Service error:', {
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
               },
            });
         } else {
            const controllerError = createInternalError(error);
            console.error('❌ Unexpected error:', {
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
               },
            });
         }
      }
   }

   async healthCheck(req: Request, res: Response): Promise<void> {
      res.json({
         status: 'healthy',
         timestamp: new Date().toISOString(),
         version: '2.0.0',
         services: {
            storage: 'connected',
            ai_models: 'available',
         },
      });
   }
}

export const chatController = new ChatController();
export { ChatController };
