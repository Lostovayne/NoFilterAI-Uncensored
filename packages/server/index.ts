import dotenv from 'dotenv';
import type { Request, Response } from 'express';
import express from 'express';
import z from 'zod';
import { chatService } from './services/chat.service';

dotenv.config();

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
      const response = await chatService.sendMessage(prompt, conversationId);
      res.json({ message: response.message, conversationId: conversationId });
   } catch (error) {
      console.error('Error calling OpenAI:', error);
      res.status(500).json({ error: 'Failed to generate response' });
   }
});

app.listen(port, () => {
   console.log(`Server is running on http://localhost:${port}`);
});
