import { conversationRepository } from '../repositories/conversation.repository';
import Openai from 'openai';

// Implementation details
const client = new Openai({
   baseURL: 'https://openrouter.ai/api/v1',
   apiKey: process.env.OPENROUTER_API_KEY,
});

type ChatResponse = {
   id: string;
   message: string;
};

// Public interface
export const chatService = {
   async sendMessage(prompt: string, conversationId: string): Promise<ChatResponse> {
      const history = conversationRepository.getConversationHistory(conversationId);

      if (history.length === 0) {
         conversationRepository.addMessageToConversation(conversationId, {
            role: 'system',
            content: process.env.SYSTEM_PROMPT || 'Tu eres una chica muy inteligente y creativa',
         });
      }
      conversationRepository.addMessageToConversation(conversationId, {
         role: 'user',
         content: prompt,
      });

      const response = await client.chat.completions.create({
         model: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
         messages: conversationRepository.getConversationHistory(conversationId),
         max_completion_tokens: 250,
         prompt_cache_key: conversationId,
      });

      const content = response.choices[0]?.message?.content || 'No response generated';
      conversationRepository.addMessageToConversation(conversationId, {
         role: 'assistant',
         content,
      });
      console.log('id:', response.id);
      return {
         id: response.id,
         message: content,
      };
   },
};
