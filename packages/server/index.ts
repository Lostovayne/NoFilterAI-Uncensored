import dotenv from 'dotenv';
import type { Request, Response } from 'express';
import express from 'express';
import Openai from 'openai';
import z from 'zod';
import { conversationRepository } from './repositories/conversation.repository';

dotenv.config();

const client = new Openai({
   baseURL: 'https://openrouter.ai/api/v1',
   apiKey: process.env.OPENROUTER_API_KEY,
});

const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;

const chatSchema = z.object({
   prompt: z
      .string()
      .trim()
      .min(1, 'Prompt is required')
      .max(1000, 'Prompt is too long (max 1000 characters)'),
   conversationId: z.uuid(),
});

app.get('/', async (req: Request, res: Response) => {
   res.send('Hello World!');
});

app.post('/api/chat', async (req: Request, res: Response) => {
   const parseResult = chatSchema.safeParse(req.body);

   if (!parseResult.success) {
      return res.status(400).json(z.treeifyError(parseResult.error));
   }

   try {
      const { prompt, conversationId = 'default' } = parseResult.data;
      conversationRepository.addMessageToConversation(conversationId, {
         role: 'user',
         content: prompt,
      });

      const response = await client.chat.completions.create({
         model: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
         messages: conversationRepository.getConversationHistory(conversationId),
         max_completion_tokens: 150,
      });

      const content = response.choices[0]?.message?.content || 'No response generated';
      conversationRepository.addMessageToConversation(conversationId, {
         role: 'assistant',
         content,
      });

      res.json({
         message: content,
         conversationId: conversationId,
      });
   } catch (error) {
      console.error('Error calling OpenAI:', error);
      res.status(500).json({ error: 'Failed to generate response' });
   }
});

app.listen(port, () => {
   console.log(`Server is running on http://localhost:${port}`);
});
