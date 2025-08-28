// Script de prueba para la API híbrida
const API_BASE = 'http://localhost:3000/api';

// 🔄 Test 1: Chat Simple (sin herramientas)
async function testSimpleChat() {
   console.log('\n🤖 TESTING: Chat Simple');

   const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
         prompt: 'Hola, cuéntame un chiste corto',
         conversationId: '550e8400-e29b-41d4-a716-446655440000',
         modelType: 'simple',
         taskType: 'chat',
         useMemory: false,
         useKnowledgeBase: false,
      }),
   });

   const data = await response.json();
   console.log('✅ Respuesta:', data);
   return data;
}

// 🧠 Test 2: Chat con Memoria
async function testMemoryChat() {
   console.log('\n🧠 TESTING: Chat con Memoria');

   // Primera interacción
   await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
         prompt: 'Mi nombre es Carlos y me gusta el café',
         conversationId: '550e8400-e29b-41d4-a716-446655440001',
         modelType: 'memory',
         useMemory: true,
      }),
   });

   // Segunda interacción pidiendo memoria
   const response2 = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
         prompt: '¿Recuerdas cómo me llamo y qué me gusta?',
         conversationId: '550e8400-e29b-41d4-a716-446655440001',
         modelType: 'memory',
         useMemory: true,
      }),
   });

   const data = await response2.json();
   console.log('✅ Respuesta con memoria:', data);
   return data;
}

// 🔧 Test 3: Chat con Herramientas Completas
async function testToolsChat() {
   console.log('\n🔧 TESTING: Chat con Herramientas');

   const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
         prompt:
            'Aprende esto: Vue.js es un framework progresivo de JavaScript para construir interfaces de usuario',
         conversationId: '550e8400-e29b-41d4-a716-446655440002',
         modelType: 'with_tools',
         useMemory: true,
         useKnowledgeBase: true,
      }),
   });

   const data = await response.json();
   console.log('✅ Respuesta con herramientas:', data);
   return data;
}

// 🚀 Ejecutar todas las pruebas
async function runAllTests() {
   console.log('🚀 INICIANDO TESTS DE API HÍBRIDA\n');

   try {
      await testSimpleChat();
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Esperar 2s

      await testMemoryChat();
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Esperar 2s

      await testToolsChat();

      console.log('\n✅ TODOS LOS TESTS COMPLETADOS');
   } catch (error) {
      console.error('❌ ERROR en tests:', error);
   }
}

// Si ejecutas este archivo directamente
if (typeof window === 'undefined') {
   runAllTests();
}

export { testSimpleChat, testMemoryChat, testToolsChat, runAllTests };
