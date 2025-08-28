// Test automatizado con Node.js
const fs = require('fs');

const API_BASE = 'http://localhost:3000/api/chat';

// Generar UUID simple
function generateUUID() {
   return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c == 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
   });
}

// Función para hacer requests
async function testAPI(testName, payload) {
   console.log(`\n🧪 ${testName}`);
   console.log('📤 Request:', JSON.stringify(payload, null, 2));

   try {
      const response = await fetch(API_BASE, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('📥 Response:', JSON.stringify(data, null, 2));
      console.log('⏱️  Status:', response.status);

      if (data.modelUsed) {
         console.log(`🤖 Modelo usado: ${data.modelUsed}`);
      }
      if (data.toolsUsed && data.toolsUsed.length > 0) {
         console.log(`🔧 Herramientas: ${data.toolsUsed.join(', ')}`);
      }

      return data;
   } catch (error) {
      console.error('❌ Error:', error.message);
      return null;
   }
}

// Función para esperar
function sleep(ms) {
   return new Promise((resolve) => setTimeout(resolve, ms));
}

// Tests principales
async function runTests() {
   console.log('🚀 INICIANDO TESTS AUTOMATIZADOS DE API HÍBRIDA');
   console.log('='.repeat(60));

   const conversationId1 = generateUUID();
   const conversationId2 = generateUUID();

   // Test 1: Modelo Simple
   await testAPI('Chat Simple (Dolphin-Mistral)', {
      prompt: '¿Cuáles son las ventajas de TypeScript sobre JavaScript?',
      conversationId: conversationId1,
   });

   await sleep(2000);

   // Test 2: Establecer memoria
   await testAPI('Establecer Memoria Personal', {
      prompt:
         'Soy Alex, tengo 28 años, soy fullstack developer especializado en Node.js y React. Mi hobby favorito es la fotografía',
      conversationId: conversationId2,
      modelType: 'memory',
      useMemory: true,
   });

   await sleep(2000);

   // Test 3: Probar memoria
   await testAPI('Probar Memoria', {
      prompt: '¿Podrías resumir mi perfil profesional y personal?',
      conversationId: conversationId2,
      modelType: 'memory',
      useMemory: true,
   });

   await sleep(2000);

   // Test 4: Enseñar conocimiento
   await testAPI('Enseñar Conocimiento', {
      prompt:
         'Aprende esto: Vite es un build tool que proporciona una experiencia de desarrollo más rápida para proyectos web modernos. Usa esbuild para pre-bundling.',
      conversationId: conversationId1,
      modelType: 'with_tools',
      useKnowledgeBase: true,
   });

   await sleep(2000);

   // Test 5: Consultar conocimiento
   await testAPI('Consultar Conocimiento', {
      prompt: '¿Qué puedes contarme sobre Vite y sus ventajas?',
      conversationId: generateUUID(),
      modelType: 'with_tools',
      useKnowledgeBase: true,
   });

   await sleep(2000);

   // Test 6: Híbrido completo
   await testAPI('Test Híbrido Completo', {
      prompt:
         'Basándote en mi perfil y lo que sabes sobre herramientas de desarrollo, ¿debería usar Vite en mis proyectos?',
      conversationId: conversationId2,
      modelType: 'with_tools',
      useMemory: true,
      useKnowledgeBase: true,
   });

   console.log('\n✅ TODOS LOS TESTS COMPLETADOS');

   // Generar reporte
   const report = {
      timestamp: new Date().toISOString(),
      testsRun: 6,
      conversationsUsed: [conversationId1, conversationId2],
   };

   fs.writeFileSync('test-report.json', JSON.stringify(report, null, 2));
   console.log('📊 Reporte guardado en test-report.json');
}

// Ejecutar tests
if (require.main === module) {
   runTests().catch(console.error);
}

module.exports = { testAPI, runTests };
