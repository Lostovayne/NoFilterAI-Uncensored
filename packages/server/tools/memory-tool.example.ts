import { conversationRepository } from '../repositories/conversation.repository';

// Herramienta de memoria conversacional
export const memoryTool = {
   type: 'function' as const,
   function: {
      name: 'retrieveConversationMemory',
      description:
         'buscar información específica de la conversación anterior cuando el usuario hace referencia a algo que se discutió antes',
      parameters: {
         type: 'object',
         properties: {
            query: {
               type: 'string',
               description:
                  'qué información específica buscar de la conversación (ej: "cuando hablamos de X", "lo que dije sobre Y")',
            },
            timeframe: {
               type: 'string',
               enum: ['recent', 'middle', 'beginning', 'all'],
               description: 'en qué parte de la conversación buscar',
            },
         },
         required: ['query'],
      },
   },
};

// Implementación de la función de memoria
export async function retrieveConversationMemory(
   conversationId: string,
   query: string,
   timeframe: 'recent' | 'middle' | 'beginning' | 'all' = 'all'
) {
   try {
      const fullHistory = conversationRepository.getConversationHistory(conversationId);

      if (fullHistory.length === 0) {
         return { found: false, message: 'No hay historial de conversación' };
      }

      let searchHistory = fullHistory;

      // Filtrar por marco temporal
      switch (timeframe) {
         case 'recent':
            searchHistory = fullHistory.slice(-10); // Últimos 10 mensajes
            break;
         case 'middle':
            const start = Math.floor(fullHistory.length * 0.3);
            const end = Math.floor(fullHistory.length * 0.7);
            searchHistory = fullHistory.slice(start, end);
            break;
         case 'beginning':
            searchHistory = fullHistory.slice(0, 10); // Primeros 10 mensajes
            break;
         case 'all':
         default:
            searchHistory = fullHistory;
      }

      // Buscar mensajes relevantes (búsqueda simple por contenido)
      const queryLower = query.toLowerCase();
      const relevantMessages = searchHistory.filter(
         (msg) =>
            msg.content.toLowerCase().includes(queryLower) ||
            queryLower
               .split(' ')
               .some((word) => word.length > 3 && msg.content.toLowerCase().includes(word))
      );

      if (relevantMessages.length === 0) {
         return {
            found: false,
            message: `No encontré información sobre "${query}" en el ${timeframe === 'all' ? 'historial completo' : timeframe}`,
         };
      }

      // Formatear los mensajes encontrados
      const contextInfo = relevantMessages
         .map((msg, index) => `${msg.role}: ${msg.content}`)
         .join('\n---\n');

      return {
         found: true,
         message: `Encontré ${relevantMessages.length} mensaje(s) relevante(s) sobre "${query}":`,
         context: contextInfo,
         timeframe,
         totalMessages: relevantMessages.length,
      };
   } catch (error) {
      console.error('Error al buscar en memoria conversacional:', error);
      return {
         found: false,
         message: 'Error al acceder a la memoria conversacional',
      };
   }
}
