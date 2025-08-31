import { configDotenv } from 'dotenv';
import { StorageFactory } from './repositories/conversation.repository.js';

configDotenv();

async function checkRedisData() {
   console.log('��� Checking Redis data...');
   console.log('Environment check:');
   console.log(`  STORAGE_TYPE: ${process.env.STORAGE_TYPE}`);
   console.log(
      `  UPSTASH_REDIS_REST_URL: ${process.env.UPSTASH_REDIS_REST_URL ? '✅ Set' : '❌ Missing'}`
   );
   console.log(
      `  UPSTASH_REDIS_REST_TOKEN: ${process.env.UPSTASH_REDIS_REST_TOKEN ? '✅ Set' : '❌ Missing'}`
   );

   try {
      const provider = StorageFactory.createProvider('redis');

      console.log('\n��� Checking conversation data in Redis...');
      const conversationKeys = await provider.keys('conversation:*');
      console.log(`Found ${conversationKeys.length} conversation keys:`);

      for (const key of conversationKeys) {
         console.log(`  - ${key}`);
         const data = await provider.get(key);
         if (data && Array.isArray(data)) {
            console.log(`    Messages: ${data.length}`);
            data.forEach((msg, index) => {
               console.log(`    ${index + 1}. [${msg.role}]: ${msg.content.slice(0, 50)}...`);
            });
         }
      }

      if (conversationKeys.length === 0) {
         console.log('  No conversations found. This could mean:');
         console.log('  1. No chat requests have been made yet');
         console.log('  2. Conversations expired (TTL)');
         console.log('  3. Redis data was cleared');
      }
   } catch (error) {
      console.error('❌ Error checking Redis:', error.message);
   }
}

checkRedisData();
