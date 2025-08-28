import { ModelType, TaskType, type ModelConfig } from '../types/model.types';

// Configuración de modelos disponibles
const MODEL_CONFIGS: Record<string, ModelConfig> = {
   // Modelo simple sin herramientas - Chat rápido y económico
   'simple-chat': {
      name: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
      provider: 'openrouter',
      supports: { tools: false, vision: false, streaming: true },
      maxTokens: 250,
   },

   // Modelo con herramientas - Memoria, conocimiento y tools
   'tools-chat': {
      name: 'meta-llama/llama-4-scout:free',
      provider: 'openrouter',
      supports: { tools: true, vision: false, streaming: true },
      maxTokens: 400,
   },

   // Modelo para imágenes (futuro)
   'image-generation': {
      name: 'google/gemini-2.5-flash-image-preview:free',
      provider: 'openrouter',
      supports: { tools: false, vision: false, streaming: false },
      maxTokens: 0,
   },

   // Modelo con visión (futuro)
   'vision-chat': {
      name: 'meta-llama/llama-3.2-11b-vision-instruct:free',
      provider: 'openrouter',
      supports: { tools: true, vision: true, streaming: true },
      maxTokens: 500,
   },
};

export const modelSelectorService = {
   /**
    * Selecciona el modelo apropiado basado en los parámetros de la request
    */
   selectModel(modelType: ModelType, taskType: TaskType, useMemory: boolean): ModelConfig {
      // Lógica de selección inteligente
      if (taskType === TaskType.IMAGE) {
         return MODEL_CONFIGS['image-generation']!;
      }

      if (taskType === TaskType.VISION) {
         return MODEL_CONFIGS['vision-chat']!;
      }

      // Para chat de texto
      if (modelType === ModelType.SIMPLE && !useMemory) {
         return MODEL_CONFIGS['simple-chat']!;
      }

      if (modelType === ModelType.WITH_TOOLS || modelType === ModelType.MEMORY || useMemory) {
         return MODEL_CONFIGS['tools-chat']!;
      }

      // Default fallback
      return MODEL_CONFIGS['simple-chat']!;
   },

   /**
    * Determina si el modelo soporta herramientas
    */
   supportsTools(modelType: ModelType, useMemory: boolean): boolean {
      return modelType === ModelType.WITH_TOOLS || modelType === ModelType.MEMORY || useMemory;
   },

   /**
    * Obtiene la configuración de un modelo específico
    */
   getModelConfig(modelKey: string): ModelConfig | undefined {
      return MODEL_CONFIGS[modelKey];
   },

   /**
    * Lista todos los modelos disponibles
    */
   getAvailableModels(): Record<string, ModelConfig> {
      return MODEL_CONFIGS;
   },
};
