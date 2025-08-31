import type {
   ModelConfig,
   IModelSelectorService,
   AppError,
   ValidationResult,
} from '../types/model.types';
import { ModelType, TaskType, ModelProvider, ErrorCode } from '../types/model.types';

// ===== MODEL CONFIGURATION REGISTRY =====
class ModelConfigRegistry {
   private readonly models = new Map<string, ModelConfig>();
   private readonly modelsByTask = new Map<TaskType, ModelConfig[]>();
   private readonly modelsByProvider = new Map<ModelProvider, ModelConfig[]>();

   constructor() {
      this.initializeDefaultModels();
      this.buildIndexes();
   }

   private initializeDefaultModels(): void {
      const defaultModels: ModelConfig[] = [
         {
            id: 'simple-chat',
            name: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
            provider: ModelProvider.OPENROUTER,
            supports: {
               tools: false,
               vision: false,
               streaming: true,
               imageGeneration: false,
               audioProcessing: false,
            },
            maxTokens: 200,
            isActive: true,
         },
         {
            id: 'tools-chat',
            name: 'meta-llama/llama-4-scout:free',
            provider: ModelProvider.OPENROUTER,
            supports: {
               tools: true,
               vision: false,
               streaming: true,
               imageGeneration: false,
               audioProcessing: false,
            },
            maxTokens: 500,
            isActive: true,
         },
         {
            id: 'image-generation',
            name: 'google/gemini-2.5-flash-image-preview:free',
            provider: ModelProvider.OPENROUTER,
            supports: {
               tools: false,
               vision: false,
               streaming: false,
               imageGeneration: true,
               audioProcessing: false,
            },
            maxTokens: 0,
            isActive: true,
         },
         {
            id: 'vision-chat',
            name: 'meta-llama/llama-3.2-11b-vision-instruct:free',
            provider: ModelProvider.OPENROUTER,
            supports: {
               tools: true,
               vision: true,
               streaming: true,
               imageGeneration: false,
               audioProcessing: false,
            },
            maxTokens: 400,
            isActive: true,
         },
      ];

      defaultModels.forEach((model) => {
         const validation = this.validateModelConfig(model);
         if (validation.success) {
            this.models.set(model.id, model);
         } else {
            console.error(`Invalid model config for ${model.id}:`, validation.errors);
         }
      });
   }

   private buildIndexes(): void {
      this.modelsByTask.clear();
      this.modelsByProvider.clear();

      this.models.forEach((model) => {
         // Index by capabilities/tasks
         if (model.supports.imageGeneration) {
            this.addToTaskIndex(TaskType.IMAGE, model);
         }
         if (model.supports.vision) {
            this.addToTaskIndex(TaskType.VISION, model);
         }
         if (model.supports.audioProcessing) {
            this.addToTaskIndex(TaskType.AUDIO, model);
         }
         // All models can handle chat
         this.addToTaskIndex(TaskType.CHAT, model);

         // Index by provider
         this.addToProviderIndex(model.provider, model);
      });
   }

   private addToTaskIndex(task: TaskType, model: ModelConfig): void {
      const existing = this.modelsByTask.get(task) || [];
      existing.push(model);
      this.modelsByTask.set(task, existing);
   }

   private addToProviderIndex(provider: ModelProvider, model: ModelConfig): void {
      const existing = this.modelsByProvider.get(provider) || [];
      existing.push(model);
      this.modelsByProvider.set(provider, existing);
   }

   private validateModelConfig(config: ModelConfig): ValidationResult<ModelConfig> {
      const errors: string[] = [];

      if (!config.id || config.id.trim().length === 0) {
         errors.push('Model ID is required');
      }
      if (!config.name || config.name.trim().length === 0) {
         errors.push('Model name is required');
      }
      if (!Object.values(ModelProvider).includes(config.provider)) {
         errors.push('Invalid model provider');
      }
      if (config.maxTokens < 0) {
         errors.push('Max tokens must be non-negative');
      }
      if (!config.supports) {
         errors.push('Model capabilities must be defined');
      }

      return {
         success: errors.length === 0,
         data: errors.length === 0 ? config : undefined,
         errors: errors.length > 0 ? errors : undefined,
      };
   }

   getModel(id: string): ModelConfig | undefined {
      return this.models.get(id);
   }

   getAllModels(): readonly ModelConfig[] {
      return Array.from(this.models.values()).filter((model) => model.isActive);
   }

   getModelsByTask(task: TaskType): readonly ModelConfig[] {
      return (this.modelsByTask.get(task) || []).filter((model) => model.isActive);
   }

   getModelsByProvider(provider: ModelProvider): readonly ModelConfig[] {
      return (this.modelsByProvider.get(provider) || []).filter((model) => model.isActive);
   }

   addModel(config: ModelConfig): ValidationResult<ModelConfig> {
      const validation = this.validateModelConfig(config);
      if (validation.success) {
         this.models.set(config.id, config);
         this.buildIndexes();
      }
      return validation;
   }

   removeModel(id: string): boolean {
      const removed = this.models.delete(id);
      if (removed) {
         this.buildIndexes();
      }
      return removed;
   }

   updateModel(id: string, updates: Partial<ModelConfig>): ValidationResult<ModelConfig> {
      const existing = this.models.get(id);
      if (!existing) {
         return {
            success: false,
            errors: [`Model with ID '${id}' not found`],
         };
      }

      const updatedConfig = { ...existing, ...updates, id };
      const validation = this.validateModelConfig(updatedConfig);

      if (validation.success) {
         this.models.set(id, updatedConfig);
         this.buildIndexes();
      }

      return validation;
   }
}

// ===== MODEL SELECTOR SERVICE =====
class ModelSelectorService implements IModelSelectorService {
   private readonly registry = new ModelConfigRegistry();

   selectModel(modelType: ModelType, taskType: TaskType, useMemory: boolean): ModelConfig {
      try {
         // First, try to find model by task type
         const candidateModels = this.registry.getModelsByTask(taskType);

         if (candidateModels.length === 0) {
            throw this.createModelError(
               `No models available for task type: ${taskType}`,
               ErrorCode.MODEL_NOT_FOUND
            );
         }

         // Filter by model type and capabilities
         const filteredModels = candidateModels.filter((model) => {
            switch (modelType) {
               case ModelType.SIMPLE:
                  return !useMemory && !model.supports.tools;
               case ModelType.WITH_TOOLS:
                  return model.supports.tools;
               case ModelType.MEMORY:
                  return model.supports.tools;
               default:
                  return true;
            }
         });

         if (filteredModels.length === 0) {
            // Fallback to any suitable model
            const fallbackModel = this.findFallbackModel(taskType, useMemory);
            if (fallbackModel) {
               console.warn(
                  `Using fallback model ${fallbackModel.id} for ${modelType}/${taskType}`
               );
               return fallbackModel;
            }

            throw this.createModelError(
               `No suitable models found for ${modelType} with task ${taskType}`,
               ErrorCode.MODEL_NOT_FOUND
            );
         }

         // Return the first suitable model (could implement ranking here)
         return filteredModels[0]!;
      } catch (error) {
         if (error instanceof Error && 'code' in error) {
            throw error; // Re-throw AppError
         }
         throw this.createModelError(
            'Unexpected error during model selection',
            ErrorCode.INTERNAL_SERVER_ERROR
         );
      }
   }

   supportsTools(modelType: ModelType, useMemory: boolean): boolean {
      return modelType === ModelType.WITH_TOOLS || modelType === ModelType.MEMORY || useMemory;
   }

   getModelConfig(modelId: string): ModelConfig | undefined {
      return this.registry.getModel(modelId);
   }

   getAvailableModels(): readonly ModelConfig[] {
      return this.registry.getAllModels();
   }

   getModelsByProvider(provider: ModelProvider): readonly ModelConfig[] {
      return this.registry.getModelsByProvider(provider);
   }

   getModelsByTask(task: TaskType): readonly ModelConfig[] {
      return this.registry.getModelsByTask(task);
   }

   addModel(config: ModelConfig): ValidationResult<ModelConfig> {
      return this.registry.addModel(config);
   }

   updateModel(id: string, updates: Partial<ModelConfig>): ValidationResult<ModelConfig> {
      return this.registry.updateModel(id, updates);
   }

   removeModel(id: string): boolean {
      return this.registry.removeModel(id);
   }

   private findFallbackModel(taskType: TaskType, useMemory: boolean): ModelConfig | undefined {
      const allModels = this.registry.getAllModels();

      // Try to find any model that can handle the task
      if (taskType === TaskType.IMAGE) {
         return allModels.find((m) => m.supports.imageGeneration);
      }
      if (taskType === TaskType.VISION) {
         return allModels.find((m) => m.supports.vision);
      }
      if (taskType === TaskType.AUDIO) {
         return allModels.find((m) => m.supports.audioProcessing);
      }

      // For chat tasks, prefer tools-enabled models if memory is requested
      if (useMemory) {
         return allModels.find((m) => m.supports.tools);
      }

      // Return any available model as ultimate fallback
      return allModels[0];
   }

   private createModelError(message: string, code: ErrorCode): AppError {
      return {
         code,
         message,
         timestamp: new Date(),
      };
   }
}

// ===== EXPORTS =====
export const modelSelectorService = new ModelSelectorService();
export { ModelSelectorService, ModelConfigRegistry };
