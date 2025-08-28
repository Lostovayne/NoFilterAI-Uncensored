import type { Request, Response } from 'express';

import z from 'zod';
import { chatService } from '../services/chat.service';
import { ModelType, TaskType } from '../types/model.types';

// Detail Implementation
const chatSchema = z.object({
   prompt: z
      .string()
      .trim()
      .min(1, 'Prompt is required')
      .max(1000, 'Prompt is too long (max 1000 characters)'),
   conversationId: z.uuid(),
   modelType: z.nativeEnum(ModelType).optional().default(ModelType.SIMPLE),
   taskType: z.nativeEnum(TaskType).optional().default(TaskType.CHAT),
   useMemory: z.boolean().optional().default(false),
   useKnowledgeBase: z.boolean().optional().default(false),
});

// Public Interface
export const chatController = {
   getMessage: async (req: Request, res: Response) => {
      res.send('Hello World!');
   },
   sendMessage: async (req: Request, res: Response) => {
      console.log('📥 Request recibido:', req.body);

      const parseResult = chatSchema.safeParse(req.body);

      if (!parseResult.success) {
         console.log('❌ Error de validación:', parseResult.error);
         return res.status(400).json(z.treeifyError(parseResult.error));
      }

      console.log('✅ Request validado:', parseResult.data);

      try {
         const { prompt, conversationId, modelType, taskType, useMemory, useKnowledgeBase } =
            parseResult.data;

         console.log('🚀 Llamando a chatService...');
         const response = await chatService.sendMessage({
            prompt,
            conversationId,
            modelType,
            taskType,
            useMemory,
            useKnowledgeBase,
         });

         console.log('✅ Respuesta exitosa:', response);
         res.json({
            message: response.message,
            conversationId: response.conversationId,
            modelUsed: response.modelUsed,
            toolsUsed: response.toolsUsed,
         });
      } catch (error) {
         console.error('❌ Error calling chat service:', error);
         res.status(500).json({ error: 'Failed to generate response' });
      }
   },
};
