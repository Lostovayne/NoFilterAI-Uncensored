// Ejemplos de uso de la API híbrida

// 📝 CHAT SIMPLE (sin herramientas)
const chatSimple = {
   prompt: 'Hola, ¿cómo estás?',
   conversationId: '123e4567-e89b-12d3-a456-426614174000',
   modelType: 'simple',
   taskType: 'chat',
   useMemory: false,
   useKnowledgeBase: false,
};

// 🧠 CHAT CON MEMORIA (con herramientas)
const chatWithMemory = {
   prompt: '¿Recuerdas lo que hablamos sobre JavaScript?',
   conversationId: '123e4567-e89b-12d3-a456-426614174000',
   modelType: 'memory',
   taskType: 'chat',
   useMemory: true,
   useKnowledgeBase: false,
};

// 🔧 CHAT CON HERRAMIENTAS COMPLETAS
const chatWithTools = {
   prompt:
      'Aprende esto: React hooks son funciones que permiten usar estado en componentes funcionales',
   conversationId: '123e4567-e89b-12d3-a456-426614174000',
   modelType: 'with_tools',
   taskType: 'chat',
   useMemory: true,
   useKnowledgeBase: true,
};

// 🎨 GENERACIÓN DE IMÁGENES
const imageGeneration = {
   prompt: 'Crea una imagen de un gato volando en el espacio con estrellas de fondo',
   conversationId: '123e4567-e89b-12d3-a456-426614174000',
   modelType: 'simple',
   taskType: 'image',
   useMemory: false,
   useKnowledgeBase: false,
};

// 🌅 IMAGEN DE PAISAJE
const landscapeImage = {
   prompt: 'Generate a beautiful sunset over mountains with a lake reflection',
   conversationId: '123e4567-e89b-12d3-a456-426614174000',
   taskType: 'image',
};

// 🤖 AUTOMÁTICO (la IA decide las herramientas)
const chatAuto = {
   prompt: '¿Qué me dijiste sobre React la semana pasada?',
   conversationId: '123e4567-e89b-12d3-a456-426614174000',
   // Los valores por defecto se aplicarán automáticamente
};

/* 
🎯 CASOS DE USO:

1. **Chat Casual**: modelType: "simple" 
   - Conversaciones rápidas sin contexto
   - Respuestas más rápidas y económicas

2. **Chat con Memoria**: modelType: "memory", useMemory: true
   - Cuando necesitas que recuerde la conversación
   - "¿Qué dijiste antes sobre X?"

3. **Chat Educativo**: modelType: "with_tools", useKnowledgeBase: true
   - Para aprender y guardar información
   - "Aprende esto: [información]"

4. **Chat Híbrido**: useMemory: true, useKnowledgeBase: true
   - Combina memoria y conocimiento
   - Experiencia completa de IA

5. **Generación de Imágenes**: taskType: "image"
   - Crear imágenes desde descripciones de texto
   - "Crea una imagen de..."
   - Respuesta incluye imágenes en formato base64

📊 COMPARACIÓN DE MODELOS:

simple        → Rápido, sin herramientas, económico
memory        → Memoria conversacional, contexto inteligente  
with_tools    → Herramientas completas, aprendizaje, búsqueda
image         → Generación de imágenes con IA

*/

export { chatSimple, chatWithMemory, chatWithTools, chatAuto, imageGeneration, landscapeImage };
