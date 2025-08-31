import { StorageFactory } from './repositories/conversation.repository.js';

async function debugRedisStorage() {
   console.log('��� Debugging Redis Storage...');
   console.log('='.repeat(50));

   try {
      console.log('��� Environment Configuration:');
      console.log(`  STORAGE_TYPE: ${process.env.STORAGE_TYPE}`);
      console.log(
         `  UPSTASH_REDIS_REST_URL: ${process.env.UPSTASH_REDIS_REST_URL ? '✅ Set' : '❌ Missing'}`
      );
      console.log(
         `  UPSTASH_REDIS_REST_TOKEN: ${process.env.UPSTASH_REDIS_REST_TOKEN ? '✅ Set' : '❌ Missing'}`
      );

      console.log('\n��� Creating Redis provider...');
      const provider = StorageFactory.createProvider('redis');

      console.log('��� Testing Redis connection...');
      const pingResult = await provider.ping();
      console.log(`Ping result: ${pingResult}`);

      if (pingResult) {
         console.log('\n��� Checking existing conversation data...');
         const allKeys = await provider.keys('conversation:*');
         console.log(`Found ${allKeys.length} conversation keys:`);

         for (const key of allKeys) {
            console.log(`  - ${key}`);
            const data = await provider.get(key);
            if (data && Array.isArray(data)) {
               console.log(`    Messages: ${data.length}`);
            }
         }

         if (allKeys.length === 0) {
            console.log('  No conversations found in Redis.');
            console.log('  This is normal for a fresh setup.');
         }

         console.log('\n��� Testing basic operations...');
         const testKey = 'test:debug';
         const testValue = { test: true, timestamp: new Date() };

         await provider.set(testKey, testValue, 60);
         const retrieved = await provider.get(testKey);
         console.log('✅ SET/GET test successful:', retrieved);

         await provider.delete(testKey);
         const deleted = await provider.exists(testKey);
         console.log('✅ DELETE test successful:', !deleted);
      } else {
         console.log('❌ Redis connection failed');
      }
   } catch (error) {
      console.error('❌ Error during Redis debug:', error.message);
   }
}

debugRedisStorage().catch(console.error);
