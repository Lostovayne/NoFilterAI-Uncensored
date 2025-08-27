// Implementation details
const conversations = new Map<string, Array<{ role: 'user' | 'assistant'; content: string }>>();

// Export interface public ->  Private implementation details
export const conversationRepository = {
   addMessageToConversation(
      conversationId: string,
      message: { role: 'user' | 'assistant'; content: string }
   ) {
      const history = conversations.get(conversationId) || [];
      history.push(message);
      conversations.set(conversationId, history);
   },

   getConversationHistory(conversationId: string) {
      return conversations.get(conversationId) || [];
   },
};
