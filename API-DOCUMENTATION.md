# NoFilter AI Backend - Documentación de API

## 📋 Información General

- **Base URL**: `http://localhost:3000`
- **Content-Type**: `application/json`
- **Protocolo**: HTTP/HTTPS
- **Autenticación**: No requerida (por ahora)

## 🔧 Variables de Entorno Requeridas

```env
GEMINI_API_KEY=tu_api_key_de_gemini
UPSTASH_REDIS_REST_URL=opcional_para_persistencia
UPSTASH_REDIS_REST_TOKEN=opcional_para_persistencia
PORT=3000
```

## 📊 Health Check

### GET `/health`

Verifica el estado del servidor y la configuración.

**Respuesta:**

```json
{
   "status": "ok",
   "timestamp": "2025-09-21T10:30:00.000Z",
   "storage": "memory",
   "redis_configured": false
}
```

## 🤖 Endpoints de Chat

### 1. Chat con Gemini 2.5 Pro

**POST** `/api/chat/gemini`

Chat inteligente con el modelo Gemini 2.5 Pro.

**Body:**

```json
{
   "prompt": "¿Cuál es la capital de Francia?",
   "conversationId": "conv_123456",
   "taskType": "chat",
   "useKnowledgeBase": true
}
```

**Parámetros:**

- `prompt` (string, requerido): Mensaje del usuario
- `conversationId` (string, requerido): ID único de la conversación
- `taskType` (string, opcional): `"chat"` | `"vision"` | `"audio"` | `"text_to_speech"` | `"speech_to_text"` (default: `"chat"`)
- `useKnowledgeBase` (boolean, opcional): Usar base de conocimientos (default: `true`)

**Respuesta Exitosa (200):**

```json
{
   "success": true,
   "data": {
      "id": "msg_789012",
      "message": "La capital de Francia es París.",
      "modelUsed": "gemini-2.5-flash-lite",
      "toolsUsed": [],
      "conversationId": "conv_123456",
      "usage": {
         "promptTokens": 25,
         "completionTokens": 15,
         "totalTokens": 40
      }
   }
}
```

**Respuesta de Error (500):**

```json
{
   "success": false,
   "error": "Error de Gemini API: mensaje de error"
}
```

### 2. Chat Sin Censura

**POST** `/api/chat/uncensored`

Chat sin restricciones usando modelo sin censura.

**Body:**

```json
{
   "prompt": "Tu mensaje aquí",
   "conversationId": "conv_123456"
}
```

**Parámetros:**

- `prompt` (string, requerido): Mensaje del usuario
- `conversationId` (string, requerido): ID único de la conversación

**Respuesta:** Igual estructura que Gemini chat.

## 🎨 Generación de Imágenes

### POST `/api/chat/gemini/image`

Genera imágenes usando Gemini 2.5 Flash Image Preview.

**Body:**

```json
{
   "prompt": "Un gato jugando en un jardín colorido",
   "conversationId": "conv_123456",
   "style": "photorealistic",
   "quality": "high",
   "aspectRatio": "1:1"
}
```

**Parámetros:**

- `prompt` (string, requerido): Descripción de la imagen
- `conversationId` (string, requerido): ID único de la conversación
- `style` (string, opcional): `"photorealistic"` | `"artistic"` | `"cartoon"` | `"abstract"` (default: `"photorealistic"`)
- `quality` (string, opcional): `"standard"` | `"high"` (default: `"high"`)
- `aspectRatio` (string, opcional): `"1:1"` | `"16:9"` | `"9:16"` | `"4:3"` (default: `"1:1"`)

**Respuesta Exitosa (200):**

```json
{
   "success": true,
   "data": {
      "id": "img_789012",
      "message": "✅ Imagen generada exitosamente: gemini-image-1758425553062.png",
      "modelUsed": "gemini-2.5-flash-image-preview",
      "toolsUsed": ["native_image_generation"],
      "conversationId": "conv_123456",
      "images": [
         {
            "type": "image",
            "imageUrl": {
               "url": "/generated-images/gemini-image-1758425553062.png"
            },
            "metadata": {
               "format": "png",
               "prompt": "Un gato jugando en un jardín colorido",
               "size": "1485760 bytes"
            }
         }
      ],
      "usage": {
         "promptTokens": 35,
         "completionTokens": 20,
         "totalTokens": 55
      }
   }
}
```

## 🎵 Generación de Audio

### POST `/api/chat/gemini/audio`

Genera audio usando Gemini TTS (Text-to-Speech).

**Body:**

```json
{
   "prompt": "Hola, bienvenido a NoFilter AI",
   "conversationId": "conv_123456",
   "voice": "female",
   "speed": 1.0
}
```

**Parámetros:**

- `prompt` (string, requerido): Texto a convertir en audio
- `conversationId` (string, requerido): ID único de la conversación
- `voice` (string, opcional): `"male"` | `"female"` (default: `"female"`)
- `speed` (number, opcional): Velocidad de reproducción entre 0.5 y 2.0 (default: `1.0`)

**Respuesta Exitosa (200):**

```json
{
   "success": true,
   "data": {
      "id": "audio_789012",
      "message": "🎵 Audio generado exitosamente: gemini-audio-1758425553062.wav",
      "modelUsed": "gemini-2.5-flash-preview-tts",
      "toolsUsed": ["audio_generation"],
      "conversationId": "conv_123456",
      "audioUrl": "/generated-audio/gemini-audio-1758425553062.wav",
      "usage": {
         "promptTokens": 30,
         "completionTokens": 25,
         "totalTokens": 55
      }
   }
}
```

## 🎬 Generación de Video

### POST `/api/chat/gemini/video`

Genera videos usando Veo 3.0.

**Body:**

```json
{
   "prompt": "Un perro corriendo en la playa al atardecer",
   "conversationId": "conv_123456",
   "duration": 5,
   "quality": "standard"
}
```

**Parámetros:**

- `prompt` (string, requerido): Descripción del video
- `conversationId` (string, requerido): ID único de la conversación
- `duration` (number, opcional): Duración en segundos entre 1 y 10 (default: `5`)
- `quality` (string, opcional): `"draft"` | `"standard"` | `"high"` (default: `"standard"`)

**Respuesta Exitosa (200):**

```json
{
   "success": true,
   "data": {
      "id": "video_789012",
      "message": "🎬 Video generado exitosamente: gemini-video-1758425553062.mp4",
      "modelUsed": "veo-3.0-generate-001",
      "toolsUsed": ["video_generation"],
      "conversationId": "conv_123456",
      "videoUrl": "/generated-videos/gemini-video-1758425553062.mp4",
      "usage": {
         "promptTokens": 40,
         "completionTokens": 30,
         "totalTokens": 70
      }
   }
}
```

**⚠️ Nota:** La generación de video puede tomar varios minutos debido al polling de la API de Veo.

## 📁 Archivos Estáticos

Los archivos generados se sirven a través de rutas estáticas:

- **Imágenes**: `/generated-images/{filename}.png`
- **Audios**: `/generated-audio/{filename}.wav`
- **Videos**: `/generated-videos/{filename}.mp4`

**Ejemplo de acceso:**

```
GET http://localhost:3000/generated-images/gemini-image-1758425553062.png
GET http://localhost:3000/generated-audio/gemini-audio-1758425553062.wav
GET http://localhost:3000/generated-videos/gemini-video-1758425553062.mp4
```

## 🔗 Integración con React Native

### Configuración Base

```javascript
const API_BASE_URL = 'http://localhost:3000'; // Cambiar por tu URL de producción

// Para React Native, usar la IP local en desarrollo
// const API_BASE_URL = 'http://192.168.1.100:3000';
```

### Ejemplo de Chat

```javascript
const sendMessage = async (prompt, conversationId) => {
   try {
      const response = await fetch(`${API_BASE_URL}/api/chat/gemini`, {
         method: 'POST',
         headers: {
            'Content-Type': 'application/json',
         },
         body: JSON.stringify({
            prompt,
            conversationId,
            taskType: 'chat',
            useKnowledgeBase: true,
         }),
      });

      const data = await response.json();

      if (data.success) {
         return data.data;
      } else {
         throw new Error(data.error);
      }
   } catch (error) {
      console.error('Error sending message:', error);
      throw error;
   }
};
```

### Ejemplo de Generación de Imagen

```javascript
const generateImage = async (prompt, conversationId, options = {}) => {
   try {
      const response = await fetch(`${API_BASE_URL}/api/chat/gemini/image`, {
         method: 'POST',
         headers: {
            'Content-Type': 'application/json',
         },
         body: JSON.stringify({
            prompt,
            conversationId,
            style: options.style || 'photorealistic',
            quality: options.quality || 'high',
            aspectRatio: options.aspectRatio || '1:1',
         }),
      });

      const data = await response.json();

      if (data.success && data.data.images) {
         // La URL de la imagen será algo como: /generated-images/filename.png
         const imageUrl = `${API_BASE_URL}${data.data.images[0].imageUrl.url}`;
         return { ...data.data, imageUrl };
      } else {
         throw new Error(data.error || 'No image generated');
      }
   } catch (error) {
      console.error('Error generating image:', error);
      throw error;
   }
};
```

### Ejemplo de Generación de Audio

```javascript
const generateAudio = async (prompt, conversationId, options = {}) => {
   try {
      const response = await fetch(`${API_BASE_URL}/api/chat/gemini/audio`, {
         method: 'POST',
         headers: {
            'Content-Type': 'application/json',
         },
         body: JSON.stringify({
            prompt,
            conversationId,
            voice: options.voice || 'female',
            speed: options.speed || 1.0,
         }),
      });

      const data = await response.json();

      if (data.success && data.data.audioUrl) {
         const audioUrl = `${API_BASE_URL}${data.data.audioUrl}`;
         return { ...data.data, audioUrl };
      } else {
         throw new Error(data.error || 'No audio generated');
      }
   } catch (error) {
      console.error('Error generating audio:', error);
      throw error;
   }
};
```

## 🔗 Integración con Next.js

### API Route (pages/api/chat.js)

```javascript
// pages/api/chat.js
export default async function handler(req, res) {
   if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
   }

   const { prompt, conversationId, endpoint = 'gemini', options = {} } = req.body;

   try {
      const apiUrl = `${process.env.BACKEND_URL}/api/chat/${endpoint}`;

      const response = await fetch(apiUrl, {
         method: 'POST',
         headers: {
            'Content-Type': 'application/json',
         },
         body: JSON.stringify({
            prompt,
            conversationId,
            ...options,
         }),
      });

      const data = await response.json();
      res.status(response.status).json(data);
   } catch (error) {
      res.status(500).json({ error: error.message });
   }
}
```

### Hook de React

```javascript
// hooks/useChat.js
import { useState } from 'react';

export const useChat = () => {
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState(null);

   const sendMessage = async (prompt, conversationId, endpoint = 'gemini', options = {}) => {
      setLoading(true);
      setError(null);

      try {
         const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
            },
            body: JSON.stringify({
               prompt,
               conversationId,
               endpoint,
               options,
            }),
         });

         const data = await response.json();

         if (data.success) {
            return data.data;
         } else {
            throw new Error(data.error);
         }
      } catch (err) {
         setError(err.message);
         throw err;
      } finally {
         setLoading(false);
      }
   };

   return { sendMessage, loading, error };
};
```

## ⚠️ Manejo de Errores

Todos los endpoints pueden devolver los siguientes errores:

### Error de Validación (400)

```json
{
   "success": false,
   "error": "Prompt es requerido"
}
```

### Error del Servidor (500)

```json
{
   "success": false,
   "error": "Error de Gemini API: mensaje específico del error"
}
```

### Códigos de Error Comunes

- `400` - Bad Request (parámetros inválidos)
- `500` - Internal Server Error (error del modelo de IA o servidor)
- `404` - Not Found (endpoint no existe)
- `405` - Method Not Allowed (método HTTP incorrecto)

## 📝 Notas Importantes

1. **Conversación ID**: Debe ser único por conversación. Recomendamos usar UUIDs.

2. **Archivos Generados**: Se almacenan localmente en el servidor. En producción, considera usar almacenamiento en la nube.

3. **Rate Limiting**: Actualmente no implementado. Considera agregarlo en producción.

4. **CORS**: Configurar apropiadamente para producción.

5. **Seguridad**: Agregar autenticación y autorización en producción.

6. **Timeouts**: La generación de video puede tomar varios minutos debido al polling.

## 🚀 Ejemplo de Implementación Completa

```javascript
class NoFilterAIClient {
   constructor(baseUrl) {
      this.baseUrl = baseUrl;
   }

   async chat(prompt, conversationId, options = {}) {
      return this._request('/api/chat/gemini', {
         prompt,
         conversationId,
         taskType: options.taskType || 'chat',
         useKnowledgeBase: options.useKnowledgeBase !== false,
      });
   }

   async generateImage(prompt, conversationId, options = {}) {
      return this._request('/api/chat/gemini/image', {
         prompt,
         conversationId,
         style: options.style || 'photorealistic',
         quality: options.quality || 'high',
         aspectRatio: options.aspectRatio || '1:1',
      });
   }

   async generateAudio(prompt, conversationId, options = {}) {
      return this._request('/api/chat/gemini/audio', {
         prompt,
         conversationId,
         voice: options.voice || 'female',
         speed: options.speed || 1.0,
      });
   }

   async generateVideo(prompt, conversationId, options = {}) {
      return this._request('/api/chat/gemini/video', {
         prompt,
         conversationId,
         duration: options.duration || 5,
         quality: options.quality || 'standard',
      });
   }

   async uncensoredChat(prompt, conversationId) {
      return this._request('/api/chat/uncensored', {
         prompt,
         conversationId,
      });
   }

   async _request(endpoint, body) {
      try {
         const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
         });

         const data = await response.json();

         if (data.success) {
            return data.data;
         } else {
            throw new Error(data.error);
         }
      } catch (error) {
         console.error(`Error in ${endpoint}:`, error);
         throw error;
      }
   }

   getMediaUrl(path) {
      return `${this.baseUrl}${path}`;
   }
}

// Uso
const client = new NoFilterAIClient('http://localhost:3000');

// Chat
const chatResponse = await client.chat('Hola, ¿cómo estás?', 'conv_123');

// Imagen
const imageResponse = await client.generateImage('Un gato en el espacio', 'conv_123');
const imageUrl = client.getMediaUrl(imageResponse.images[0].imageUrl.url);

// Audio
const audioResponse = await client.generateAudio('Hola mundo', 'conv_123');
const audioUrl = client.getMediaUrl(audioResponse.audioUrl);

// Video
const videoResponse = await client.generateVideo('Un perro corriendo', 'conv_123');
const videoUrl = client.getMediaUrl(videoResponse.videoUrl);
```

Esta documentación proporciona toda la información necesaria para integrar el backend con cualquier aplicación React Native o Next.js.
