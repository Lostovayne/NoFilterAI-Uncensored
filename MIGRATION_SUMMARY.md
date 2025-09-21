# 🚀 NoFilterAI Backend - Sistema Optimizado con Gemini 2.5 Pro

## 📋 Resumen de la Migración

### ✅ **Cambios Implementados:**

1. **Eliminada integración problemática de OpenRouter** (excepto para chat sin censura)
2. **Implementado Gemini 2.5 Pro** como motor principal
3. **Optimizado selección de modelos** según capacidades específicas
4. **Mejorado sistema de memoria** (Redis temporal + Upstash Search persistente)
5. **Creados endpoints separados** para diferentes usos

---

## 🎯 **Modelos Optimizados por Tarea**

| Tarea                        | Modelo Gemini                                  | Capacidad Real                              | Costo              |
| ---------------------------- | ---------------------------------------------- | ------------------------------------------- | ------------------ |
| **Chat General**             | `gemini-2.5-flash-lite`                        | ✅ Chat inteligente                         | ⭐⭐⭐ Más barato  |
| **"Generación" de Imágenes** | `gemini-2.5-flash`                             | ⚠️ Prompts optimizados (no imágenes reales) | ⭐⭐ Económico     |
| **Análisis de Visión**       | `gemini-2.5-flash`                             | ✅ Análisis de imágenes                     | ⭐⭐ Económico     |
| **Audio/TTS/STT**            | `gemini-2.5-flash-preview-native-audio-dialog` | ✅ Audio nativo                             | ⭐⭐ Especializado |

### **🖼️ Generación REAL de Imágenes:**

Para generar imágenes reales, necesitas configurar:

- **DALL-E 3** (OpenAI) - Imágenes de alta calidad
- **Midjourney API** - Estilo artístico
- **Stable Diffusion** - Open source

**Lo que hace Gemini actualmente:** Genera prompts MUY detallados y optimizados que puedes usar en cualquier herramienta de generación de imágenes.

---

## 🔗 **Nuevos Endpoints Disponibles**

### **Gemini 2.5 Pro (Profesional)**

```
GET  /api/chat/gemini          # Información del API
POST /api/chat/gemini          # Chat avanzado con herramientas
POST /api/chat/gemini/image    # Generación de imágenes especializada
GET  /api/chat/gemini/health   # Health check
```

### **Chat Sin Censura**

```
GET  /api/chat/uncensored        # Información del API
POST /api/chat/uncensored        # Chat libre sin restricciones
GET  /api/chat/uncensored/health # Health check
```

### **Legacy (Compatibilidad)**

```
GET  /api/chat    # Información básica
POST /api/chat    # Chat básico (redirige a Gemini)
```

---

## 🛠️ **Parámetros Profesionales (Gemini)**

```json
{
   "prompt": "Tu mensaje aquí",
   "conversationId": "uuid-v4",
   "taskType": "chat|image|vision|audio|text_to_speech|speech_to_text",
   "useMemory": true,
   "useKnowledgeBase": true,
   "temperature": 0.8, // 0-2: Creatividad
   "topK": 30, // 1-40: Diversidad de tokens
   "topP": 0.9, // 0-1: Nucleus sampling
   "maxTokens": 4096, // Máximo según modelo
   "safetyLevel": "none" // none|low|medium|high
}
```

---

## 💾 **Sistema de Memoria Optimizado**

### **Redis (Temporal - 24h TTL)**

- ✅ Almacena conversaciones del día
- ✅ Se elimina automáticamente después de 24 horas
- ✅ Ideal para contexto de sesión

### **Upstash Search (Persistente)**

- ✅ Base de conocimiento del usuario
- ✅ Información importante permanente
- ✅ Búsqueda semántica avanzada

### **Herramientas Disponibles:**

- `storeUserInfo` - Guardar información del usuario permanentemente
- `recallUserInfo` - Buscar información del usuario
- `storeTempData` - Guardar datos temporales (24h)
- `getTempData` - Recuperar datos temporales

---

## 🔧 **Configuración Requerida**

### **Variables de Entorno (.env):**

```env
# Gemini API Key (REQUERIDA)
GEMINI_API_KEY=tu_api_key_de_google_ai_studio

# OpenRouter (solo para chat sin censura)
OPENROUTER_API_KEY=tu_api_key_actual

# Redis (chats temporales)
UPSTASH_REDIS_REST_URL=tu_url_actual
UPSTASH_REDIS_REST_TOKEN=tu_token_actual

# Search (conocimiento persistente)
UPSTASH_SEARCH_REST_URL=tu_url_actual
UPSTASH_SEARCH_REST_TOKEN=tu_token_actual
```

---

## 🚨 **Problemas Resueltos**

### **Antes:**

❌ Error: "Unauthorized: Invalid auth token" en Upstash  
❌ Uso ineficiente de modelos costosos  
❌ Dependencia problemática de OpenRouter  
❌ Falta de especialización por tarea

### **Después:**

✅ Configuración correcta de autenticación  
✅ Modelos optimizados por costo y capacidad  
✅ Gemini 2.5 Pro como motor principal  
✅ Especialización por tipo de contenido

---

## 🎯 **Próximos Pasos**

1. **Obtén tu API Key de Gemini:**
   - Ve a [Google AI Studio](https://aistudio.google.com/)
   - Crea una nueva API key
   - Reemplaza `YOUR_GEMINI_API_KEY_HERE` en el `.env`

2. **Verifica tokens de Upstash:**
   - Confirma que tus tokens de Redis y Search sean correctos
   - Los errores de autenticación deberían desaparecer

3. **Prueba los endpoints:**
   - Usa el archivo `test-backend.http`
   - Comienza con `/health` para verificar conectividad
   - Prueba `/api/chat/gemini` para funcionalidad completa

4. **Monitorea el rendimiento:**
   - Los logs mostrarán qué modelo se usa para cada tarea
   - Ajusta parámetros según tus necesidades

---

## 💡 **Beneficios del Nuevo Sistema**

- 🎯 **Especialización**: Cada tarea usa el modelo más apropiado
- 💰 **Costo optimizado**: Flash-Lite para chat, especializados para tareas complejas
- 🧠 **Memoria inteligente**: Temporal + persistente según necesidad
- 🔒 **Sin censura opcional**: Endpoint dedicado para contenido libre
- 📈 **Escalabilidad**: Arquitectura preparada para crecimiento

¡Tu sistema está listo para funcionar de manera óptima! 🎉
