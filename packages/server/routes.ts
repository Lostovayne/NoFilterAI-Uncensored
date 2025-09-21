import express from 'express';
import { z } from 'zod';
import { chatController } from './controllers/chat.controller';
import toolsRouter from './routes/tools.routes';
import { chatService } from './services/chat.service';
import { geminiService } from './services/gemini.service';
import { ModelType, TaskType } from './types/model.types';

const router = express.Router();

// Schemas de validación
const geminiRequestSchema = z.object({
   prompt: z.string().trim().min(1, 'Prompt es requerido'),
   conversationId: z.string().min(1, 'ConversationId es requerido'),
   taskType: z.nativeEnum(TaskType).optional().default(TaskType.CHAT),
   useKnowledgeBase: z.boolean().optional().default(true),
});

const imageRequestSchema = z.object({
   prompt: z.string().trim().min(1, 'Prompt es requerido'),
   conversationId: z.string().min(1, 'ConversationId es requerido'),
   style: z
      .enum(['photorealistic', 'artistic', 'cartoon', 'abstract'])
      .optional()
      .default('photorealistic'),
   quality: z.enum(['standard', 'high']).optional().default('high'),
   aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3']).optional().default('1:1'),
});

const audioRequestSchema = z.object({
   prompt: z.string().trim().min(1, 'Prompt es requerido'),
   conversationId: z.string().min(1, 'ConversationId es requerido'),
   voice: z.enum(['male', 'female']).optional().default('female'),
   speed: z.number().min(0.5).max(2.0).optional().default(1.0),
});

const videoRequestSchema = z.object({
   prompt: z.string().trim().min(1, 'Prompt es requerido'),
   conversationId: z.string().min(1, 'ConversationId es requerido'),
   duration: z.number().min(1).max(10).optional().default(5),
   quality: z.enum(['draft', 'standard', 'high']).optional().default('standard'),
});

const uncensoredRequestSchema = z.object({
   prompt: z.string().trim().min(1, 'Prompt es requerido'),
   conversationId: z.string().min(1, 'ConversationId es requerido'),
});

// Rutas del chat original (mantenidas para compatibilidad)
router.get('/', chatController.getMessage);
router.post('/', chatController.sendMessage);

// Nuevas rutas para Gemini 2.5 Pro
const geminiRouter = express.Router();

geminiRouter.post('/', async (req, res) => {
   try {
      const validated = geminiRequestSchema.parse(req.body);
      const response = await geminiService.sendMessage(validated);
      res.json({ success: true, data: response });
   } catch (error) {
      console.error('❌ Error en Gemini chat:', error);
      const message = error instanceof Error ? error.message : 'Error desconocido';
      res.status(500).json({ success: false, error: message });
   }
});

geminiRouter.post('/image', async (req, res) => {
   try {
      const validated = imageRequestSchema.parse(req.body);
      const response = await geminiService.generateImage(
         validated.prompt,
         validated.conversationId,
         {
            style: validated.style,
            quality: validated.quality,
            aspectRatio: validated.aspectRatio,
         }
      );
      res.json({ success: true, data: response });
   } catch (error) {
      console.error('❌ Error en generación de imagen:', error);
      const message = error instanceof Error ? error.message : 'Error desconocido';
      res.status(500).json({ success: false, error: message });
   }
});

geminiRouter.post('/audio', async (req, res) => {
   try {
      const validated = audioRequestSchema.parse(req.body);
      const response = await geminiService.generateAudio(
         validated.prompt,
         validated.conversationId,
         {
            voice: validated.voice,
            speed: validated.speed,
         }
      );
      res.json({ success: true, data: response });
   } catch (error) {
      console.error('❌ Error en generación de audio:', error);
      const message = error instanceof Error ? error.message : 'Error desconocido';
      res.status(500).json({ success: false, error: message });
   }
});

geminiRouter.post('/video', async (req, res) => {
   try {
      const validated = videoRequestSchema.parse(req.body);
      const response = await geminiService.generateVideo(
         validated.prompt,
         validated.conversationId,
         {
            duration: validated.duration,
            quality: validated.quality,
         }
      );
      res.json({ success: true, data: response });
   } catch (error) {
      console.error('❌ Error en generación de video:', error);
      const message = error instanceof Error ? error.message : 'Error desconocido';
      res.status(500).json({ success: false, error: message });
   }
});

// Nuevas rutas para chat sin censura
const uncensoredRouter = express.Router();

uncensoredRouter.post('/', async (req, res) => {
   try {
      const validated = uncensoredRequestSchema.parse(req.body);
      const response = await chatService.sendMessage({
         ...validated,
         modelType: ModelType.UNCENSORED,
         taskType: TaskType.CHAT,
      });
      res.json({ success: true, data: response });
   } catch (error) {
      console.error('❌ Error en chat uncensored:', error);
      const message = error instanceof Error ? error.message : 'Error desconocido';
      res.status(500).json({ success: false, error: message });
   }
});

// Montar sub-routers
router.use('/gemini', geminiRouter);
router.use('/uncensored', uncensoredRouter);
router.use('/tools', toolsRouter);

export default router;
