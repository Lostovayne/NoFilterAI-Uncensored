import { Redis } from '@upstash/redis';

// Configuración de Redis para toda la gestión de memoria
let redis: Redis | null = null;
try {
   if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      redis = new Redis({
         url: process.env.UPSTASH_REDIS_REST_URL,
         token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      console.log('✅ Redis initialized for memory management');
   }
} catch (error) {
   console.warn('⚠️ Redis initialization failed:', error);
}

// Solo Redis para toda la gestión de memoria
console.log('📦 Usando Redis como único sistema de memoria');

// ===== HERRAMIENTAS DE MEMORIA =====

export const memoryTools = {
   // Tool 1: Almacenar información temporal (Redis)
   async storeShortTermMemory(conversationId: string, key: string, data: string): Promise<string> {
      try {
         if (!redis) {
            return 'Error: Redis no está configurado. Memoria temporal no disponible.';
         }

         const redisKey = `temp:${conversationId}:${key}`;
         await redis.setex(redisKey, 3600, data); // 1 hora de TTL

         console.log(`💾 Stored short-term memory: ${redisKey}`);
         return `✅ Información temporal almacenada exitosamente (clave: ${key}, válida por 1 hora)`;
      } catch (error) {
         console.error('Error storing short-term memory:', error);
         return `❌ Error al almacenar información temporal: ${error instanceof Error ? error.message : 'Error desconocido'}`;
      }
   },

   // Tool 2: Recuperar información temporal (Redis)
   async getShortTermMemory(conversationId: string, key: string): Promise<string> {
      try {
         if (!redis) {
            return 'Error: Redis no está configurado. Memoria temporal no disponible.';
         }

         const redisKey = `temp:${conversationId}:${key}`;
         const data = await redis.get(redisKey);

         if (data) {
            console.log(`📦 Retrieved short-term memory: ${redisKey}`);
            return `📦 Información encontrada: ${data}`;
         } else {
            return `🔍 No se encontró información temporal con la clave: ${key}`;
         }
      } catch (error) {
         console.error('Error retrieving short-term memory:', error);
         return `❌ Error al recuperar información temporal: ${error instanceof Error ? error.message : 'Error desconocido'}`;
      }
   },

   // Tool 3: Almacenar información personal de largo plazo (Redis)
   async storeLongTermMemory(userId: string, content: string, category: string): Promise<string> {
      try {
         if (!redis) {
            return 'Error: Redis no está configurado. Memoria de largo plazo no disponible.';
         }

         const key = `longterm:${userId}:${category}:${Date.now()}`;
         const dataToStore = {
            content,
            category,
            timestamp: new Date().toISOString(),
            userId,
            type: 'user_knowledge',
         };

         await redis.setex(key, 86400 * 30, JSON.stringify(dataToStore)); // 30 días
         console.log(`💾 Stored long-term memory: ${category} for user ${userId}`);
         return `✅ Información personal almacenada en memoria a largo plazo (categoría: ${category})`;
      } catch (error) {
         console.error('Error storing long-term memory:', error);
         return `❌ Error al almacenar información personal: ${error instanceof Error ? error.message : 'Error desconocido'}`;
      }
   },

   // Tool 4: Buscar información personal de largo plazo (Redis)
   async searchLongTermMemory(userId: string, query: string): Promise<string> {
      try {
         if (!redis) {
            return 'Error: Redis no está configurado. Memoria de largo plazo no disponible.';
         }

         const pattern = `longterm:${userId}:*`;
         const keys = await redis.keys(pattern);

         if (keys.length === 0) {
            return `🔍 No se encontró información personal para: "${query}"`;
         }

         const results = await Promise.all(
            keys.map(async (key) => {
               const data = await redis.get(key);
               return data ? JSON.parse(data as string) : null;
            })
         );

         const validResults = results.filter((r) => {
            return (
               r !== null &&
               r.content &&
               typeof r.content === 'string' &&
               r.content.toLowerCase().includes(query.toLowerCase())
            );
         });

         if (validResults.length === 0) {
            return `🔍 No se encontró información personal relevante para: "${query}"`;
         }

         const formattedResults = validResults
            .slice(0, 5) // Limitar a 5 resultados
            .map((result, index) => {
               const timestamp = result.timestamp
                  ? new Date(result.timestamp).toLocaleDateString()
                  : 'Sin fecha';
               return `${index + 1}. [${result.category}] ${result.content} (${timestamp})`;
            })
            .join('\n');

         console.log(`📋 Found ${validResults.length} results for user ${userId}`);
         return `📋 Información personal encontrada:\n${formattedResults}`;
      } catch (error) {
         console.error('Error searching long-term memory:', error);
         return `❌ Error al buscar información personal: ${error instanceof Error ? error.message : 'Error desconocido'}`;
      }
   },

   // Tool 5: Obtener historial de conversación (Redis)
   async getConversationHistory(conversationId: string): Promise<string> {
      try {
         if (!redis) {
            return 'Error: Redis no está configurado. Historial no disponible.';
         }

         const pattern = `chat:${conversationId}:*`;
         const keys = await redis.keys(pattern);

         if (keys.length === 0) {
            return `🔍 No se encontró historial para la conversación: ${conversationId}`;
         }

         const messages = await Promise.all(
            keys.map(async (key) => {
               const data = await redis.get(key);
               return data ? JSON.parse(data as string) : null;
            })
         );

         const validMessages = messages
            .filter((msg) => msg !== null)
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

         if (validMessages.length === 0) {
            return `🔍 No hay mensajes válidos en el historial de la conversación: ${conversationId}`;
         }

         const formattedHistory = validMessages
            .slice(-10)
            .map((msg, index) => {
               const time = new Date(msg.timestamp).toLocaleTimeString();
               const role = msg.role === 'user' ? '👤 Usuario' : '🤖 Asistente';
               const content =
                  msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : '');
               return `${index + 1}. [${time}] ${role}: ${content}`;
            })
            .join('\n');

         console.log(`📚 Retrieved conversation history: ${validMessages.length} messages`);
         return `📚 Historial de conversación (últimos ${validMessages.slice(-10).length} mensajes):\n${formattedHistory}`;
      } catch (error) {
         console.error('Error retrieving conversation history:', error);
         return `❌ Error al recuperar historial: ${error instanceof Error ? error.message : 'Error desconocido'}`;
      }
   },

   // Tool 6: Analizar y categorizar información del usuario
   async analyzeUserInfo(
      content: string
   ): Promise<{ shouldStore: boolean; category: string; reason: string }> {
      const personalPatterns = {
         personal_info: [
            /me llamo|mi nombre es/i,
            /soy de|vivo en|nacido en/i,
            /mi edad|tengo \d+ años/i,
            /mi trabajo|trabajo en|trabajo como/i,
         ],
         preferences: [
            /me gusta|me encanta|prefiero/i,
            /no me gusta|odio|detesto/i,
            /mi favorito|mi preferido/i,
         ],
         skills: [
            /sé|conozco|tengo experiencia/i,
            /programo en|uso|trabajo con/i,
            /especialista en|experto en/i,
         ],
         goals: [/quiero aprender|necesito|mi objetivo/i, /planeo|voy a|mi meta/i],
         coding_style: [/siempre uso|prefiero usar|mi estilo/i, /así es como|esta es mi forma/i],
      };

      for (const [category, patterns] of Object.entries(personalPatterns)) {
         for (const pattern of patterns) {
            if (pattern.test(content)) {
               return {
                  shouldStore: true,
                  category,
                  reason: `Información de ${category} detectada`,
               };
            }
         }
      }

      return {
         shouldStore: false,
         category: 'general',
         reason: 'No se detectó información personal relevante',
      };
   },
};

// ===== DEFINICIONES DE TOOLS PARA GEMINI =====

export const geminiToolDefinitions = [
   {
      name: 'store_short_term_memory',
      description:
         'Almacena información temporal en Redis que será útil durante la conversación actual (TTL: 1 hora)',
      parameters: {
         type: 'object',
         properties: {
            conversationId: {
               type: 'string',
               description: 'ID de la conversación actual',
            },
            key: {
               type: 'string',
               description: 'Clave única para identificar la información',
            },
            data: {
               type: 'string',
               description: 'Datos a almacenar temporalmente',
            },
         },
         required: ['conversationId', 'key', 'data'],
      },
   },
   {
      name: 'get_short_term_memory',
      description: 'Recupera información temporal almacenada en Redis durante la conversación',
      parameters: {
         type: 'object',
         properties: {
            conversationId: {
               type: 'string',
               description: 'ID de la conversación actual',
            },
            key: {
               type: 'string',
               description: 'Clave de la información a recuperar',
            },
         },
         required: ['conversationId', 'key'],
      },
   },
   {
      name: 'store_long_term_memory',
      description:
         'Almacena información personal importante del usuario en memoria de largo plazo (preferencias, datos personales, estilo de código, etc.)',
      parameters: {
         type: 'object',
         properties: {
            userId: {
               type: 'string',
               description: 'ID único del usuario',
            },
            content: {
               type: 'string',
               description: 'Información personal a almacenar',
            },
            category: {
               type: 'string',
               description: 'Categoría de la información',
               enum: ['personal_info', 'preferences', 'skills', 'goals', 'coding_style', 'general'],
            },
         },
         required: ['userId', 'content', 'category'],
      },
   },
   {
      name: 'search_long_term_memory',
      description: 'Busca información personal del usuario en memoria de largo plazo',
      parameters: {
         type: 'object',
         properties: {
            userId: {
               type: 'string',
               description: 'ID único del usuario',
            },
            query: {
               type: 'string',
               description: 'Consulta para buscar información relevante',
            },
         },
         required: ['userId', 'query'],
      },
   },
   {
      name: 'get_conversation_history',
      description: 'Obtiene el historial de la conversación actual desde Redis',
      parameters: {
         type: 'object',
         properties: {
            conversationId: {
               type: 'string',
               description: 'ID de la conversación',
            },
         },
         required: ['conversationId'],
      },
   },
];

// ===== EJECUTOR DE TOOLS =====

export async function executeMemoryTool(
   toolName: string,
   parameters: Record<string, unknown>
): Promise<string> {
   try {
      switch (toolName) {
         case 'store_short_term_memory':
            return await memoryTools.storeShortTermMemory(
               parameters.conversationId as string,
               parameters.key as string,
               parameters.data as string
            );

         case 'get_short_term_memory':
            return await memoryTools.getShortTermMemory(
               parameters.conversationId as string,
               parameters.key as string
            );

         case 'store_long_term_memory':
            return await memoryTools.storeLongTermMemory(
               parameters.userId as string,
               parameters.content as string,
               parameters.category as string
            );

         case 'search_long_term_memory':
            return await memoryTools.searchLongTermMemory(
               parameters.userId as string,
               parameters.query as string
            );

         case 'get_conversation_history':
            return await memoryTools.getConversationHistory(parameters.conversationId as string);

         default:
            return `❌ Tool desconocida: ${toolName}`;
      }
   } catch (error) {
      console.error(`Error executing tool ${toolName}:`, error);
      return `❌ Error ejecutando tool ${toolName}: ${error instanceof Error ? error.message : 'Error desconocido'}`;
   }
}
