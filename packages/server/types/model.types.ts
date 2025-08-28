// Tipos de modelos disponibles
export enum ModelType {
   SIMPLE = 'simple', // Chat básico sin herramientas
   WITH_TOOLS = 'with_tools', // Chat con herramientas (memoria, conocimiento)
   MEMORY = 'memory', // Chat con memoria conversacional
}

// Tipos de tareas que puede realizar la IA
export enum TaskType {
   CHAT = 'chat', // Conversación de texto
   IMAGE = 'image', // Generación de imágenes
   AUDIO = 'audio', // Procesamiento de audio
   VISION = 'vision', // Análisis de imágenes
}

// Configuración de modelos específicos
export interface ModelConfig {
   name: string;
   provider: 'openrouter' | 'openai' | 'anthropic' | 'custom';
   supports: {
      tools: boolean;
      vision: boolean;
      streaming: boolean;
   };
   maxTokens: number;
   costPer1KTokens?: number;
}

// Request de chat con opciones de modelo
export interface ChatRequest {
   prompt: string;
   conversationId: string;
   modelType?: ModelType;
   taskType?: TaskType;
   useMemory?: boolean;
   useKnowledgeBase?: boolean;
}

// Respuesta de chat
export interface ChatResponse {
   id: string;
   message: string;
   modelUsed: string;
   toolsUsed?: string[];
   conversationId: string;
}
