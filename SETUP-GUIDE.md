# 🚀 NoFilter AI - Setup y Uso

## 🏁 Inicio Rápido

### 1. Levantar Frontend y Backend

```bash
bun run dev
```

Esto levanta automáticamente:

- **Backend**: http://localhost:3000 (API)
- **Frontend**: http://localhost:5174 (Chat UI)

### 2. Acceso a la Aplicación

- **Chat UI**: http://localhost:5174
- **API Health**: http://localhost:3000/health
- **Imágenes generadas**: http://localhost:3000/generated-images/

## 🤖 Endpoints Disponibles

### 1. Chat con Gemini 2.5 Pro

```http
POST http://localhost:3000/api/chat/gemini
{
   "prompt": "Tu mensaje aquí",
   "conversationId": "unique-id-123",
   "taskType": "chat",
   "useKnowledgeBase": true
}
```

### 2. Generación REAL de Imágenes

```http
POST http://localhost:3000/api/chat/gemini/image
{
   "prompt": "A beautiful sunset over mountains",
   "conversationId": "unique-id-123",
   "style": "photorealistic",
   "quality": "high",
   "aspectRatio": "16:9"
}
```

### 3. Chat Sin Censura

```http
POST http://localhost:3000/api/chat/uncensored
{
   "prompt": "Tu mensaje sin filtros aquí",
   "conversationId": "unique-id-123"
}
```

## 🎨 Estilos de Imagen Disponibles

- `photorealistic`: Fotorrealista de alta calidad
- `artistic`: Estilo artístico/pintoresco
- `cartoon`: Estilo cartoon/animado
- `abstract`: Arte abstracto/conceptual

## 📐 Relaciones de Aspecto

- `1:1`: Cuadrado (perfecto para avatares)
- `16:9`: Horizontal (ideal para paisajes)
- `9:16`: Vertical (ideal para stories)
- `4:3`: Clásico (ideal para fotos tradicionales)

## 🧠 Modelos Optimizados por Tarea

### Gemini 2.5 Flash Lite (Económico)

- **Uso**: Chat básico, respuestas rápidas
- **Costo**: Muy bajo
- **Tokens**: Hasta 4K

### Gemini 2.5 Flash Image Preview (Imágenes)

- **Uso**: Generación REAL de imágenes
- **Costo**: Medio
- **Formatos**: PNG, alta resolución

### Gemini 2.5 Flash (Visión)

- **Uso**: Análisis de imágenes/videos
- **Costo**: Medio
- **Capacidades**: Multimodal completo

### Dolphin Mistral 24B (Sin Censura)

- **Uso**: Chat sin filtros
- **Costo**: Bajo
- **Proveedor**: OpenRouter

## 🎯 Funcionalidades del Frontend

### Chat Multimodal

- ✅ Chat inteligente con Gemini 2.5 Pro
- ✅ Generación REAL de imágenes (se guardan en servidor)
- ✅ Chat sin censura con OpenRouter
- ⏳ Procesamiento de audio (próximamente)
- ⏳ Generación de video (próximamente)

### Gestión de Conversaciones

- ✅ Múltiples conversaciones simultáneas
- ✅ Historial persistente
- ✅ Diferentes endpoints por conversación
- ✅ Eliminación de conversaciones

### Personalización

- ✅ Selección de estilo de imagen
- ✅ Control de relación de aspecto
- ✅ Configuración por endpoint

## 🛠️ Desarrollo

### Comandos Útiles

```bash
# Levantar solo el backend
bun run dev:server

# Levantar solo el frontend
bun run dev:client

# Compilar para producción
bun run build:all

# Probar endpoints con archivo HTTP
# Usar: packages/server/test-backend.http
```

### Testing

- Usar el archivo `test-backend.http` en VS Code con la extensión REST Client
- O usar el frontend en http://localhost:5174
- Las imágenes generadas se guardan en `packages/server/generated-images/`

## 🌟 Próximas Funcionalidades

1. **Audio Processing**
   - Generación de voz con TTS
   - Reconocimiento de voz (STT)
   - Grabación desde el frontend

2. **Video Generation**
   - Generación con Veo 3.0
   - Análisis de video con Gemini Vision
   - Upload y preview en frontend

3. **Advanced Features**
   - Sistema de memoria persistente
   - Upload de archivos desde UI
   - Chat en tiempo real con WebSockets
   - Generación de música con IA

¡Tu sistema está funcionando perfectamente! 🎉
