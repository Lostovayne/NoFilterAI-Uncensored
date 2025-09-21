import * as crypto from 'crypto-js';
import express from 'express';
import { z } from 'zod';
import { memoryTools } from '../tools/memory-tools';

const router = express.Router();

// Schema para herramientas de memoria
const storeMemorySchema = z.object({
   conversationId: z.string().min(1),
   key: z.string().min(1),
   data: z.string().min(1),
});

const getMemorySchema = z.object({
   conversationId: z.string().min(1),
   key: z.string().min(1),
});

const storeLongTermSchema = z.object({
   conversationId: z.string().min(1),
   content: z.string().min(1),
   category: z.enum(['personal_info', 'preferences', 'skills', 'goals', 'coding_style', 'general']),
});

const searchLongTermSchema = z.object({
   conversationId: z.string().min(1),
   query: z.string().min(1),
});

// ===== ENDPOINTS DE HERRAMIENTAS =====

// Almacenar memoria temporal
router.post('/memory/short-term', async (req, res) => {
   try {
      const validated = storeMemorySchema.parse(req.body);
      const result = await memoryTools.storeShortTermMemory(
         validated.conversationId,
         validated.key,
         validated.data
      );
      res.json({ success: true, message: result });
   } catch (error) {
      console.error('❌ Error storing short-term memory:', error);
      const message = error instanceof Error ? error.message : 'Error desconocido';
      res.status(500).json({ success: false, error: message });
   }
});

// Recuperar memoria temporal
router.post('/memory/short-term/get', async (req, res) => {
   try {
      const validated = getMemorySchema.parse(req.body);
      const result = await memoryTools.getShortTermMemory(validated.conversationId, validated.key);
      res.json({ success: true, data: result });
   } catch (error) {
      console.error('❌ Error retrieving short-term memory:', error);
      const message = error instanceof Error ? error.message : 'Error desconocido';
      res.status(500).json({ success: false, error: message });
   }
});

// Almacenar memoria de largo plazo
router.post('/memory/long-term', async (req, res) => {
   try {
      const validated = storeLongTermSchema.parse(req.body);

      // Generar userId basado en conversationId
      const userId = crypto.SHA256(validated.conversationId).toString().substring(0, 16);

      const result = await memoryTools.storeLongTermMemory(
         userId,
         validated.content,
         validated.category
      );
      res.json({ success: true, message: result });
   } catch (error) {
      console.error('❌ Error storing long-term memory:', error);
      const message = error instanceof Error ? error.message : 'Error desconocido';
      res.status(500).json({ success: false, error: message });
   }
});

// Buscar memoria de largo plazo
router.post('/memory/long-term/search', async (req, res) => {
   try {
      const validated = searchLongTermSchema.parse(req.body);

      // Generar userId basado en conversationId
      const userId = crypto.SHA256(validated.conversationId).toString().substring(0, 16);

      const result = await memoryTools.searchLongTermMemory(userId, validated.query);
      res.json({ success: true, data: result });
   } catch (error) {
      console.error('❌ Error searching long-term memory:', error);
      const message = error instanceof Error ? error.message : 'Error desconocido';
      res.status(500).json({ success: false, error: message });
   }
});

// Obtener historial de conversación
router.post('/memory/history', async (req, res) => {
   try {
      const { conversationId } = req.body;

      if (!conversationId) {
         return res.status(400).json({ success: false, error: 'conversationId es requerido' });
      }

      const result = await memoryTools.getConversationHistory(conversationId);
      res.json({ success: true, data: result });
   } catch (error) {
      console.error('❌ Error retrieving conversation history:', error);
      const message = error instanceof Error ? error.message : 'Error desconocido';
      res.status(500).json({ success: false, error: message });
   }
});

// Analizar información del usuario
router.post('/memory/analyze', async (req, res) => {
   try {
      const { content } = req.body;

      if (!content) {
         return res.status(400).json({ success: false, error: 'content es requerido' });
      }

      const result = await memoryTools.analyzeUserInfo(content);
      res.json({ success: true, data: result });
   } catch (error) {
      console.error('❌ Error analyzing user info:', error);
      const message = error instanceof Error ? error.message : 'Error desconocido';
      res.status(500).json({ success: false, error: message });
   }
});

// Endpoint de prueba para verificar configuración
router.get('/status', (req, res) => {
   const redisConfigured = !!(
      process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
   );

   res.json({
      success: true,
      status: {
         redis_configured: redisConfigured,
         memory_system: 'Redis Only',
         tools_available: redisConfigured,
         timestamp: new Date().toISOString(),
      },
   });
});

export default router;
