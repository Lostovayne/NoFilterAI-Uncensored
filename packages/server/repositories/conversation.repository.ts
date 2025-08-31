import type { ConversationMessage, IConversationRepository, AppError } from '../types/model.types';
import { MessageRole, ErrorCode } from '../types/model.types';

// ===== STORAGE ABSTRACTION =====
export interface IStorageProvider {
   get<T>(key: string): Promise<T | null>;
   set<T>(key: string, value: T, ttl?: number): Promise<void>;
   delete(key: string): Promise<void>;
   exists(key: string): Promise<boolean>;
   keys(pattern?: string): Promise<string[]>;
}

// ===== IN-MEMORY STORAGE IMPLEMENTATION =====
class MemoryStorageProvider implements IStorageProvider {
   private storage = new Map<string, { value: unknown; expires?: number }>();

   async get<T>(key: string): Promise<T | null> {
      const item = this.storage.get(key);
      if (!item) return null;

      if (item.expires && Date.now() > item.expires) {
         this.storage.delete(key);
         return null;
      }

      return item.value as T;
   }

   async set<T>(key: string, value: T, ttl?: number): Promise<void> {
      const expires = ttl ? Date.now() + ttl * 1000 : undefined;
      this.storage.set(key, { value, expires });
   }

   async delete(key: string): Promise<void> {
      this.storage.delete(key);
   }

   async exists(key: string): Promise<boolean> {
      const item = this.storage.get(key);
      if (!item) return false;

      if (item.expires && Date.now() > item.expires) {
         this.storage.delete(key);
         return false;
      }

      return true;
   }

   async keys(pattern?: string): Promise<string[]> {
      const allKeys = Array.from(this.storage.keys());
      if (!pattern) return allKeys;

      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return allKeys.filter((key) => regex.test(key));
   }
}

// ===== UPSTASH REDIS STORAGE IMPLEMENTATION =====
class UpstashRedisStorageProvider implements IStorageProvider {
   private redisClient: any;
   private isConfigured: boolean = false;

   constructor() {
      this.initializeRedis();
   }

   private initializeRedis() {
      try {
         // Dynamic import to avoid module loading issues
         const { Redis } = require('@upstash/redis');

         const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
         const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

         if (!redisUrl || !redisToken) {
            console.warn('⚠️ Upstash Redis not configured. Required environment variables:');
            console.warn('- UPSTASH_REDIS_REST_URL');
            console.warn('- UPSTASH_REDIS_REST_TOKEN');
            console.warn('Falling back to memory storage.');
            this.isConfigured = false;
            return;
         }

         this.redisClient = new Redis({
            url: redisUrl,
            token: redisToken,
            // Optional: Configure additional options
            automaticDeserialization: true,
         });

         this.isConfigured = true;
         console.log('✅ Upstash Redis initialized successfully');
      } catch (error) {
         console.error('❌ Failed to initialize Upstash Redis:', error);
         console.warn('Falling back to memory storage.');
         this.isConfigured = false;
      }
   }

   async get<T>(key: string): Promise<T | null> {
      if (!this.isConfigured) {
         throw new Error('Upstash Redis not configured');
      }

      try {
         const result = await this.redisClient.get(key);
         return result || null;
      } catch (error) {
         console.error('Redis GET error:', error);
         throw new Error(`Failed to get key ${key}: ${error}`);
      }
   }

   async set<T>(key: string, value: T, ttl?: number): Promise<void> {
      if (!this.isConfigured) {
         throw new Error('Upstash Redis not configured');
      }

      try {
         if (ttl) {
            await this.redisClient.setex(key, ttl, value);
         } else {
            await this.redisClient.set(key, value);
         }
      } catch (error) {
         console.error('Redis SET error:', error);
         throw new Error(`Failed to set key ${key}: ${error}`);
      }
   }

   async delete(key: string): Promise<void> {
      if (!this.isConfigured) {
         throw new Error('Upstash Redis not configured');
      }

      try {
         await this.redisClient.del(key);
      } catch (error) {
         console.error('Redis DELETE error:', error);
         throw new Error(`Failed to delete key ${key}: ${error}`);
      }
   }

   async exists(key: string): Promise<boolean> {
      if (!this.isConfigured) {
         throw new Error('Upstash Redis not configured');
      }

      try {
         const result = await this.redisClient.exists(key);
         return result === 1;
      } catch (error) {
         console.error('Redis EXISTS error:', error);
         return false;
      }
   }

   async keys(pattern?: string): Promise<string[]> {
      if (!this.isConfigured) {
         throw new Error('Upstash Redis not configured');
      }

      try {
         return await this.redisClient.keys(pattern || '*');
      } catch (error) {
         console.error('Redis KEYS error:', error);
         return [];
      }
   }

   // Additional Upstash-specific methods
   async ping(): Promise<boolean> {
      if (!this.isConfigured) {
         return false;
      }

      try {
         const result = await this.redisClient.ping();
         return result === 'PONG';
      } catch (error) {
         console.error('Redis PING error:', error);
         return false;
      }
   }

   async flushAll(): Promise<void> {
      if (!this.isConfigured) {
         throw new Error('Upstash Redis not configured');
      }

      try {
         await this.redisClient.flushall();
      } catch (error) {
         console.error('Redis FLUSHALL error:', error);
         throw new Error(`Failed to flush database: ${error}`);
      }
   }
}

// ===== CONVERSATION REPOSITORY IMPLEMENTATION =====
class ConversationRepository implements IConversationRepository {
   private readonly CONVERSATION_PREFIX = 'conversation:';
   private readonly MESSAGE_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

   constructor(private storageProvider: IStorageProvider) {}

   async addMessage(conversationId: string, message: ConversationMessage): Promise<void> {
      try {
         const key = this.getConversationKey(conversationId);
         const existingMessages = await this.getHistory(conversationId);

         const updatedMessages = [
            ...existingMessages,
            {
               ...message,
               timestamp: message.timestamp || new Date(),
            },
         ];

         await this.storageProvider.set(key, updatedMessages, this.MESSAGE_TTL);
      } catch (error) {
         throw this.createStorageError('Failed to add message to conversation', error);
      }
   }

   async getHistory(conversationId: string): Promise<readonly ConversationMessage[]> {
      try {
         const key = this.getConversationKey(conversationId);
         const messages = await this.storageProvider.get<ConversationMessage[]>(key);
         return messages || [];
      } catch (error) {
         throw this.createStorageError('Failed to retrieve conversation history', error);
      }
   }

   async deleteConversation(conversationId: string): Promise<void> {
      try {
         const key = this.getConversationKey(conversationId);
         await this.storageProvider.delete(key);
      } catch (error) {
         throw this.createStorageError('Failed to delete conversation', error);
      }
   }

   async conversationExists(conversationId: string): Promise<boolean> {
      try {
         const key = this.getConversationKey(conversationId);
         return await this.storageProvider.exists(key);
      } catch (error) {
         throw this.createStorageError('Failed to check conversation existence', error);
      }
   }

   private getConversationKey(conversationId: string): string {
      return `${this.CONVERSATION_PREFIX}${conversationId}`;
   }

   private createStorageError(message: string, originalError: unknown): AppError {
      return {
         code: ErrorCode.STORAGE_ERROR,
         message,
         details: { originalError: String(originalError) },
         timestamp: new Date(),
      };
   }
}

// ===== STORAGE FACTORY =====
export class StorageFactory {
   static createProvider(type: 'memory' | 'redis' = 'memory'): IStorageProvider {
      switch (type) {
         case 'memory':
            return new MemoryStorageProvider();
         case 'redis':
            return new UpstashRedisStorageProvider();
         default:
            throw new Error(`Unsupported storage type: ${type}`);
      }
   }

   static async createProviderWithFallback(
      preferredType: 'memory' | 'redis' = 'redis'
   ): Promise<IStorageProvider> {
      if (preferredType === 'redis') {
         try {
            const provider = new UpstashRedisStorageProvider();
            // Test connection
            await provider.ping();
            console.log('✅ Using Upstash Redis storage');
            return provider;
         } catch (error) {
            console.warn('⚠️ Redis connection failed, falling back to memory storage:', error);
            return new MemoryStorageProvider();
         }
      }
      return new MemoryStorageProvider();
   }
}

// ===== EXPORTED INSTANCES =====
// Use environment variable to determine storage type
const storageType = (process.env.STORAGE_TYPE as 'memory' | 'redis') || 'memory';
const storageProvider = StorageFactory.createProvider(storageType);

// Export both the repository instance and the factory for dependency injection
export const conversationRepository = new ConversationRepository(storageProvider);
export { ConversationRepository, MemoryStorageProvider, UpstashRedisStorageProvider };
