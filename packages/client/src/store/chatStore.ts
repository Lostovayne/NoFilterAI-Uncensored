import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';

export interface Message {
   id: string;
   role: 'user' | 'assistant';
   content: string;
   timestamp: Date;
   type?: 'text' | 'image' | 'audio' | 'video';
   imageUrl?: string;
   audioUrl?: string;
   videoUrl?: string;
   metadata?: Record<string, unknown>;
}
export interface Conversation {
   id: string;
   title: string;
   messages: Message[];
   lastActivity: Date;
   endpoint: 'gemini' | 'uncensored' | 'image' | 'audio' | 'video';
}

interface ChatOptions {
   taskType?: string;
   useKnowledgeBase?: boolean;
   style?: string;
   quality?: string;
   aspectRatio?: string;
   voice?: string;
   speed?: number;
   duration?: number;
}

interface ChatStore {
   // Estado
   conversations: Conversation[];
   currentConversationId: string | null;
   isLoading: boolean;
   error: string | null;

   // Configuración
   apiBaseUrl: string;

   // Acciones
   createConversation: (endpoint: 'gemini' | 'uncensored' | 'image' | 'audio' | 'video') => string;
   selectConversation: (id: string) => void;
   addMessage: (conversationId: string, message: Omit<Message, 'id' | 'timestamp'>) => void;
   sendMessage: (
      conversationId: string,
      content: string,
      endpoint: string,
      options?: ChatOptions
   ) => Promise<void>;
   generateImage: (conversationId: string, prompt: string, options?: ChatOptions) => Promise<void>;
   generateAudio: (conversationId: string, prompt: string, options?: ChatOptions) => Promise<void>;
   generateVideo: (conversationId: string, prompt: string, options?: ChatOptions) => Promise<void>;
   clearError: () => void;
   deleteConversation: (id: string) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
   // Estado inicial
   conversations: [],
   currentConversationId: null,
   isLoading: false,
   error: null,
   apiBaseUrl: '/api/chat', // Usar el proxy de Vite   // Crear nueva conversación
   createConversation: (endpoint) => {
      const id = uuidv4();
      const newConversation: Conversation = {
         id,
         title: `${endpoint.charAt(0).toUpperCase() + endpoint.slice(1)} Chat`,
         messages: [],
         lastActivity: new Date(),
         endpoint,
      };

      set((state) => ({
         conversations: [newConversation, ...state.conversations],
         currentConversationId: id,
      }));

      return id;
   },

   // Seleccionar conversación
   selectConversation: (id) => {
      set({ currentConversationId: id });
   },

   // Agregar mensaje a conversación
   addMessage: (conversationId, message) => {
      const fullMessage: Message = {
         ...message,
         id: uuidv4(),
         timestamp: new Date(),
      };

      set((state) => ({
         conversations: state.conversations.map((conv) =>
            conv.id === conversationId
               ? {
                    ...conv,
                    messages: [...conv.messages, fullMessage],
                    lastActivity: new Date(),
                 }
               : conv
         ),
      }));
   },

   // Enviar mensaje a cualquier endpoint
   sendMessage: async (conversationId, content, endpoint, options = {}) => {
      const state = get();

      // Agregar mensaje del usuario
      state.addMessage(conversationId, {
         role: 'user',
         content,
         type: 'text',
      });

      set({ isLoading: true, error: null });

      try {
         let url = '';
         const payload: Record<string, unknown> = {
            prompt: content,
            conversationId,
            ...options,
         }; // Determinar endpoint y payload según el tipo
         switch (endpoint) {
            case 'gemini':
               url = `${state.apiBaseUrl}/gemini`;
               payload.taskType = options.taskType || 'chat';
               payload.useKnowledgeBase = options.useKnowledgeBase ?? true;
               break;
            case 'uncensored':
               url = `${state.apiBaseUrl}/uncensored`;
               break;
            case 'image':
               url = `${state.apiBaseUrl}/gemini/image`;
               payload.style = options.style || 'photorealistic';
               payload.quality = options.quality || 'high';
               payload.aspectRatio = options.aspectRatio || '1:1';
               break;
            case 'audio':
               url = `${state.apiBaseUrl}/gemini/audio`;
               payload.voice = options.voice || 'female';
               payload.speed = options.speed || 1.0;
               break;
            case 'video':
               url = `${state.apiBaseUrl}/gemini/video`;
               payload.duration = options.duration || 5;
               payload.quality = options.quality || 'standard';
               break;
            default:
               throw new Error(`Endpoint no soportado: ${endpoint}`);
         }

         console.log(`🚀 Enviando a ${endpoint}:`, { url, payload });

         const response = await fetch(url, {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
         });

         if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP ${response.status}`);
         }

         const data = await response.json();
         console.log(`✅ Respuesta de ${endpoint}:`, data);

         // Agregar respuesta del asistente
         const assistantMessage: Omit<Message, 'id' | 'timestamp'> = {
            role: 'assistant',
            content: data.data.message,
            type:
               endpoint === 'image'
                  ? 'image'
                  : endpoint === 'audio'
                    ? 'audio'
                    : endpoint === 'video'
                      ? 'video'
                      : 'text',
            metadata: {
               modelUsed: data.data.modelUsed,
               toolsUsed: data.data.toolsUsed,
               provider: data.provider,
            },
         };

         // Si es una imagen, agregar la URL
         if (data.data.images && data.data.images.length > 0) {
            assistantMessage.imageUrl = data.data.images[0].imageUrl.url;
            if (assistantMessage.metadata) {
               assistantMessage.metadata.imageInfo = data.data.images[0].metadata;
            }
         }

         // Si es audio, agregar la URL del audio
         if (data.data.audioUrl) {
            assistantMessage.audioUrl = data.data.audioUrl;
         }

         // Si es video, agregar la URL del video
         if (data.data.videoUrl) {
            assistantMessage.videoUrl = data.data.videoUrl;
         }
         state.addMessage(conversationId, assistantMessage);
      } catch (error) {
         console.error(`❌ Error en ${endpoint}:`, error);

         const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

         // Agregar mensaje de error
         state.addMessage(conversationId, {
            role: 'assistant',
            content: `❌ Error: ${errorMessage}`,
            type: 'text',
            metadata: { isError: true },
         });

         set({ error: errorMessage });
      } finally {
         set({ isLoading: false });
      }
   },

   // Generar imagen (método específico)
   generateImage: async (conversationId, prompt, options = {}) => {
      const state = get();
      await state.sendMessage(conversationId, prompt, 'image', options);
   },

   // Generar audio (método específico)
   generateAudio: async (conversationId, prompt, options = {}) => {
      const state = get();
      await state.sendMessage(conversationId, prompt, 'audio', options);
   },

   // Generar video (método específico)
   generateVideo: async (conversationId, prompt, options = {}) => {
      const state = get();
      await state.sendMessage(conversationId, prompt, 'video', options);
   },

   // Limpiar error
   clearError: () => {
      set({ error: null });
   },

   // Eliminar conversación
   deleteConversation: (id) => {
      set((state) => ({
         conversations: state.conversations.filter((conv) => conv.id !== id),
         currentConversationId:
            state.currentConversationId === id ? null : state.currentConversationId,
      }));
   },
}));
