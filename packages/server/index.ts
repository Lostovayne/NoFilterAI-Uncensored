import express from 'express';
import Openai from 'openai';
import z from 'zod';

import type { Request, Response } from 'express';
import dotenv from 'dotenv';

dotenv.config();

const client = new Openai({
   baseURL: 'https://openrouter.ai/api/v1',
   apiKey: process.env.OPENROUTER_API_KEY,
});

const app = express();
app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

const port = process.env.PORT || 3000;

// Mapa para guardar las conversaciones - FUERA del endpoint para que persista
const conversations = new Map<
   string,
   Array<{ role: 'user' | 'assistant'; content: string }>
>();

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
      // Obtener historial existente o crear uno nuevo
      let conversationHistory = conversations.get(conversationId) || [];
      // Agregar el nuevo mensaje del usuario
      conversationHistory.push({ role: 'user', content: prompt });

      const response = await client.chat.completions.create({
         model: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
         messages: conversationHistory, // Enviar todo el historial
         max_completion_tokens: 150,
      });

      const content =
         response.choices[0]?.message?.content || 'No response generated';
      // Agregar la respuesta del asistente al historial
      conversationHistory.push({ role: 'assistant', content });

      // Guardar el historial actualizado
      conversations.set(conversationId, conversationHistory);

      res.json({
         message: content,
         conversationId: conversationId,
         historyLength: conversationHistory.length,
      });
   } catch (error) {
      console.error('Error calling OpenAI:', error);
      res.status(500).json({ error: 'Failed to generate response' });
   }
});

// Endpoint para ver el historial de una conversación
app.get('/api/conversation/:id', (req: Request, res: Response) => {
   const { id } = req.params;
   const conversationId = id || 'default';
   const history = conversations.get(conversationId) || [];
   res.json({
      conversationId: conversationId,
      history: history,
      messageCount: history.length,
   });
});

// Endpoint para limpiar una conversación
app.delete('/api/conversation/:id', (req: Request, res: Response) => {
   const { id } = req.params;
   const conversationId = id || 'default';
   const existed = conversations.has(conversationId);
   conversations.delete(conversationId);
   res.json({
      message: existed
         ? `Conversation ${conversationId} deleted`
         : `Conversation ${conversationId} not found`,
      deleted: existed,
   });
});

// Endpoint para listar todas las conversaciones
app.get('/api/conversations', (req: Request, res: Response) => {
   const allConversations = Array.from(conversations.keys()).map((id) => ({
      id,
      messageCount: conversations.get(id)?.length || 0,
   }));
   res.json({ conversations: allConversations });
});

app.listen(port, () => {
   console.log(`Server is running on http://localhost:${port}`);
});
