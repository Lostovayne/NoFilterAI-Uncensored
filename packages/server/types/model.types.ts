// ===== DOMAIN ENUMS =====
export enum ModelType {
   SIMPLE = 'simple', // Chat básico sin herramientas
   WITH_TOOLS = 'with_tools', // Chat con herramientas (memoria, conocimiento)
   MEMORY = 'memory', // Chat con memoria conversacional
}

export enum TaskType {
   CHAT = 'chat', // Conversación de texto
   IMAGE = 'image', // Generación de imágenes
   AUDIO = 'audio', // Procesamiento de audio
   VISION = 'vision', // Análisis de imágenes
}

export enum ModelProvider {
   OPENROUTER = 'openrouter',
   OPENAI = 'openai',
   ANTHROPIC = 'anthropic',
   CUSTOM = 'custom',
}

export enum MessageRole {
   USER = 'user',
   ASSISTANT = 'assistant',
   SYSTEM = 'system',
}

// ===== DOMAIN TYPES =====
export interface ModelCapabilities {
   readonly tools: boolean;
   readonly vision: boolean;
   readonly streaming: boolean;
   readonly imageGeneration: boolean;
   readonly audioProcessing: boolean;
}

export interface ModelConfig {
   readonly id: string;
   readonly name: string;
   readonly provider: ModelProvider;
   readonly supports: ModelCapabilities;
   readonly maxTokens: number;
   readonly costPer1KTokens?: number;
   readonly isActive: boolean;
}

export interface ConversationMessage {
   readonly role: MessageRole;
   readonly content: string;
   readonly timestamp?: Date;
   readonly metadata?: Record<string, unknown>;
}

export interface GeneratedImage {
   readonly type: string;
   readonly imageUrl: {
      readonly url: string;
   };
   readonly metadata?: {
      readonly format?: string;
      readonly size?: string;
      readonly prompt?: string;
   };
}

// ===== API DTOs =====
export interface ChatRequestDTO {
   readonly prompt: string;
   readonly conversationId: string;
   readonly modelType?: ModelType;
   readonly taskType?: TaskType;
   readonly useMemory?: boolean;
   readonly useKnowledgeBase?: boolean;
   readonly maxTokens?: number;
   readonly temperature?: number;
}

export interface ChatResponseDTO {
   readonly id: string;
   readonly message: string;
   readonly modelUsed: string;
   readonly toolsUsed: readonly string[];
   readonly conversationId: string;
   readonly images?: readonly GeneratedImage[];
   readonly timestamp: Date;
   readonly usage?: {
      readonly promptTokens: number;
      readonly completionTokens: number;
      readonly totalTokens: number;
      readonly cost?: number;
   };
}

// ===== INTERNAL SERVICE TYPES =====
export interface ChatRequest {
   prompt: string;
   conversationId: string;
   modelType?: ModelType;
   taskType?: TaskType;
   useMemory?: boolean;
   useKnowledgeBase?: boolean;
   maxTokens?: number;
   temperature?: number;
}

export interface ChatResponse {
   id: string;
   message: string;
   modelUsed: string;
   toolsUsed?: string[];
   conversationId: string;
   images?: GeneratedImage[];
   usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      cost?: number;
   };
}

// ===== ERROR TYPES =====
export enum ErrorCode {
   VALIDATION_ERROR = 'VALIDATION_ERROR',
   MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',
   RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
   CONVERSATION_NOT_FOUND = 'CONVERSATION_NOT_FOUND',
   STORAGE_ERROR = 'STORAGE_ERROR',
   EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
   INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}

export interface AppError {
   readonly code: ErrorCode;
   readonly message: string;
   readonly details?: Record<string, unknown>;
   readonly timestamp: Date;
}

// ===== VALIDATION SCHEMAS =====
export interface ValidationResult<T> {
   readonly success: boolean;
   readonly data?: T;
   readonly errors?: readonly string[];
}

// ===== REPOSITORY INTERFACES =====
export interface IConversationRepository {
   addMessage(conversationId: string, message: ConversationMessage): Promise<void>;
   getHistory(conversationId: string): Promise<readonly ConversationMessage[]>;
   deleteConversation(conversationId: string): Promise<void>;
   conversationExists(conversationId: string): Promise<boolean>;
}

export interface IKnowledgeRepository {
   addResource(resource: string): Promise<{ success: boolean; message: string }>;
   search(query: string): Promise<{ results: unknown[]; message?: string }>;
}

// ===== SERVICE INTERFACES =====
export interface IChatService {
   sendMessage(request: ChatRequest): Promise<ChatResponse>;
}

export interface IModelSelectorService {
   selectModel(modelType: ModelType, taskType: TaskType, useMemory: boolean): ModelConfig;
   supportsTools(modelType: ModelType, useMemory: boolean): boolean;
   getModelConfig(modelId: string): ModelConfig | undefined;
   getAvailableModels(): readonly ModelConfig[];
}

export interface IContextManagerService {
   getOptimizedContext(
      conversationId: string,
      maxTokens?: number
   ): Promise<{ messages: readonly ConversationMessage[]; needsMemoryTool: boolean }>;
   shouldUseMemoryTools(prompt: string): boolean;
}
