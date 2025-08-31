import type {
   ConversationMessage,
   IContextManagerService,
   IConversationRepository,
} from '../types/model.types';
import { conversationRepository } from '../repositories/conversation.repository';

class ContextManagerService implements IContextManagerService {
   private readonly DEFAULT_MAX_TOKENS = 2000;
   private readonly RECENT_MESSAGE_LIMIT = 6;
   private readonly SHORT_CONVERSATION_LIMIT = 10;

   constructor(private repository: IConversationRepository = conversationRepository) {}

   async getOptimizedContext(
      conversationId: string,
      maxTokens: number = this.DEFAULT_MAX_TOKENS
   ): Promise<{ messages: readonly ConversationMessage[]; needsMemoryTool: boolean }> {
      try {
         const fullHistory = await this.repository.getHistory(conversationId);

         // Si la conversación es corta, envía todo
         if (fullHistory.length <= this.SHORT_CONVERSATION_LIMIT) {
            return {
               messages: fullHistory,
               needsMemoryTool: false,
            };
         }

         // Para conversaciones largas: contexto reciente + system prompt
         const systemMessage = fullHistory.find((msg) => msg.role === 'system');
         const recentMessages = fullHistory.slice(-this.RECENT_MESSAGE_LIMIT);

         const contextMessages = systemMessage
            ? [systemMessage, ...recentMessages.filter((msg) => msg.role !== 'system')]
            : recentMessages;

         return {
            messages: contextMessages,
            needsMemoryTool: true,
         };
      } catch (error) {
         console.error('Error getting optimized context:', error);
         // Return empty context on error
         return {
            messages: [],
            needsMemoryTool: false,
         };
      }
   }

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
         'remember',
         'recall',
         'mentioned',
         'said before',
         'earlier',
         'previous',
      ];

      const lowerPrompt = prompt.toLowerCase();
      return memoryKeywords.some((keyword) => lowerPrompt.includes(keyword));
   }

   /**
    * Calculates approximate token count for a message
    * This is a rough estimation - for production use a proper tokenizer
    */
   private estimateTokenCount(message: ConversationMessage): number {
      // Rough estimation: ~4 characters per token
      return Math.ceil(message.content.length / 4);
   }

   /**
    * Gets context optimized for specific token limits
    */
   async getTokenOptimizedContext(
      conversationId: string,
      maxTokens: number
   ): Promise<{ messages: readonly ConversationMessage[]; estimatedTokens: number }> {
      const fullHistory = await this.repository.getHistory(conversationId);

      if (fullHistory.length === 0) {
         return { messages: [], estimatedTokens: 0 };
      }

      const systemMessage = fullHistory.find((msg) => msg.role === 'system');
      const otherMessages = fullHistory.filter((msg) => msg.role !== 'system');

      const selectedMessages: ConversationMessage[] = [];
      let totalTokens = 0;

      // Always include system message first
      if (systemMessage) {
         const systemTokens = this.estimateTokenCount(systemMessage);
         if (systemTokens < maxTokens) {
            selectedMessages.push(systemMessage);
            totalTokens += systemTokens;
         }
      }

      // Add messages from most recent, working backwards
      for (let i = otherMessages.length - 1; i >= 0; i--) {
         const message = otherMessages[i]!;
         const messageTokens = this.estimateTokenCount(message);

         if (totalTokens + messageTokens <= maxTokens) {
            selectedMessages.unshift(message); // Add to beginning
            totalTokens += messageTokens;
         } else {
            break; // Stop if we'd exceed token limit
         }
      }

      return {
         messages: selectedMessages,
         estimatedTokens: totalTokens,
      };
   }
}

export const contextManagerService = new ContextManagerService();
export { ContextManagerService };
