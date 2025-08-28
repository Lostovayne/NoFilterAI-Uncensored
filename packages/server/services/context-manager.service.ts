import { conversationRepository } from '../repositories/conversation.repository';

type Message = { role: 'user' | 'assistant' | 'system'; content: string };

export const contextManagerService = {
   /**
    * Obtiene contexto optimizado basado en límites de tokens y relevancia
    */
   getOptimizedContext(
      conversationId: string,
      maxTokens: number = 2000
   ): { messages: Message[]; needsMemoryTool: boolean } {
      const fullHistory = conversationRepository.getConversationHistory(conversationId);

      // Si la conversación es corta, envía todo
      if (fullHistory.length <= 10) {
         return {
            messages: fullHistory,
            needsMemoryTool: false,
         };
      }

      // Para conversaciones largas: contexto reciente + system prompt
      const systemMessage = fullHistory.find((msg) => msg.role === 'system');
      const recentMessages = fullHistory.slice(-6); // Últimos 6 mensajes

      const contextMessages = systemMessage
         ? [systemMessage, ...recentMessages.filter((msg) => msg.role !== 'system')]
         : recentMessages;

      return {
         messages: contextMessages,
         needsMemoryTool: true,
      };
   },

   /**
    * Determina si necesita herramientas de memoria basado en el prompt
    */
   shouldUseMemoryTools(prompt: string): boolean {
      const memoryKeywords = [
         'dijiste',
         'mencionaste',
         'hablamos',
         'antes',
         'anteriormente',
         'recordar',
         'recuerdas',
         'conversación anterior',
         'hace rato',
         'te dije',
         'te mencioné',
      ];

      return memoryKeywords.some((keyword) => prompt.toLowerCase().includes(keyword));
   },
};
