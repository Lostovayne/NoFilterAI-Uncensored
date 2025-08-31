// Upstash Redis Setup Helper
// Run with: bun setup-upstash.js

import { StorageFactory } from './repositories/conversation.repository.js';

async function setupUpstash() {
   console.log('��� Upstash Redis Setup Helper');
   console.log('='.repeat(50));

   // Check if credentials are configured
   const hasUrl = !!process.env.UPSTASH_REDIS_REST_URL;
   const hasToken = !!process.env.UPSTASH_REDIS_REST_TOKEN;
   const storageType = process.env.STORAGE_TYPE;

   console.log('��� Current Configuration:');
   console.log(`  STORAGE_TYPE: ${storageType || 'not set'}`);
   console.log(`  UPSTASH_REDIS_REST_URL: ${hasUrl ? '✅ configured' : '❌ missing'}`);
   console.log(`  UPSTASH_REDIS_REST_TOKEN: ${hasToken ? '✅ configured' : '❌ missing'}`);

   if (!hasUrl || !hasToken) {
      console.log('\n��� Setup Instructions:');
      console.log('1. Go to https://console.upstash.com/redis');
      console.log('2. Create a new Redis database');
      console.log('3. Copy the REST URL and REST TOKEN');
      console.log('4. Add them to your .env file:');
      console.log('   STORAGE_TYPE=redis');
      console.log('   UPSTASH_REDIS_REST_URL=your_url_here');
      console.log('   UPSTASH_REDIS_REST_TOKEN=your_token_here');
      return;
   }

   if (storageType !== 'redis') {
      console.log('\n⚠️  STORAGE_TYPE is not set to redis');
      console.log('Add this to your .env file: STORAGE_TYPE=redis');
      return;
   }

   // Test connection
   console.log('\n��� Testing Upstash connection...');
   try {
      const provider = StorageFactory.createProvider('redis');

      if (typeof provider.ping === 'function') {
         const pingResult = await provider.ping();
         if (pingResult) {
            console.log('✅ Upstash Redis connection successful!');

            // Test basic operations
            const testKey = 'setup:test';
            await provider.set(testKey, { setup: true, timestamp: new Date() }, 30);
            const retrieved = await provider.get(testKey);
            await provider.delete(testKey);

            console.log('✅ Basic operations working correctly');
            console.log('��� Your Upstash Redis is ready to use!');
         }
      }
   } catch (error) {
      console.error('❌ Connection failed:', error.message);
   }
}

setupUpstash().catch(console.error);
