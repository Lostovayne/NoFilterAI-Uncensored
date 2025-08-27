import type { Request, Response } from 'express';

import z from 'zod';
import { chatService } from '../services/chat.service';

// Detail Implementation
const chatSchema = z.object({
   prompt: z
      .string()
      .trim()
      .min(1, 'Prompt is required')
      .max(1000, 'Prompt is too long (max 1000 characters)'),
   conversationId: z.uuid(),
});

// Public Interface
export const chatController = {
   getMessage: async (req: Request, res: Response) => {
      res.send('Hello World!');
   },
   sendMessage: async (req: Request, res: Response) => {
      const parseResult = chatSchema.safeParse(req.body);

      if (!parseResult.success) {
         return res.status(400).json(z.treeifyError(parseResult.error));
      }

      try {
         const { prompt, conversationId = 'default' } = parseResult.data;
         const response = await chatService.sendMessage(prompt, conversationId);
         res.json({ message: response.message, conversationId: conversationId });
      } catch (error) {
         console.error('Error calling OpenAI:', error);
         res.status(500).json({ error: 'Failed to generate response' });
      }
   },
};
