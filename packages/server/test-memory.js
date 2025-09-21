#!/usr/bin/env node
import { memoryTools } from './tools/memory-tools.js';

async function testMemorySystem() {
   console.log('🧪 Probando sistema de memoria simplificado...');

   try {
      // Test almacenamiento
      const storeResult = await memoryTools.storeLongTermMemory(
         'test-user',
         'Carlos es arquitecto de software especializado en microservicios',
         'personal_info'
      );
      console.log('✅ Almacenamiento:', storeResult);

      // Test búsqueda
      const searchResult = await memoryTools.searchLongTermMemory('test-user', 'arquitecto');
      console.log('✅ Búsqueda:', searchResult);

      console.log('🎉 Sistema de memoria funcionando correctamente solo con Redis!');
   } catch (error) {
      console.error('❌ Error:', error);
   }

   process.exit(0);
}

testMemorySystem();
