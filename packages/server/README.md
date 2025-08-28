# AI Chat Server - Arquitectura Mejorada v2.0

Servidor de chat con IA construido con TypeScript, Express.js y Bun, implementando Clean Architecture y patrones modernos de desarrollo.

## 🏗️ Arquitectura General

### Principios de Diseño

- **Clean Architecture**: Separación clara entre capas de dominio, aplicación e infraestructura
- **Dependency Injection**: Inversión de dependencias para mejor testabilidad
- **Type Safety**: TypeScript estricto con interfaces bien definidas
- **Modularidad**: Componentes independientes y reutilizables
- **Escalabilidad**: Diseño preparado para crecimiento horizontal

### Estructura de Capas

```
src/
├── types/                  # 🔷 Domain Layer
│   └── model.types.ts     # Tipos de dominio, DTOs, interfaces
├── repositories/           # 🔶 Infrastructure Layer
│   └── conversation.repository.ts  # Abstracción de almacenamiento
├── services/              # 🔵 Application Layer
│   ├── chat.service.ts           # Lógica de negocio principal
│   ├── model-selector.service.ts # Gestión de modelos IA
│   └── context-manager.service.ts # Gestión de contexto
├── controllers/           # 🔸 Presentation Layer
│   └── chat.controller.ts # Endpoints HTTP y validación
└── tools/                 # 🔧 External Tools
    └── memory-tool.example.ts    # Herramientas IA
```

## 🚀 Funcionalidades Principales

### ✅ Sistema de Modelos IA

- **Selección Inteligente**: Automática basada en tipo de tarea
- **Múltiples Proveedores**: OpenRouter, OpenAI, Anthropic
- **Capacidades Específicas**: Chat, generación de imágenes, visión, herramientas
- **Configuración Flexible**: Fácil adición de nuevos modelos

### ✅ Gestión de Conversaciones

- **Almacenamiento Abstracto**: Memory/Redis intercambiables
- **Contexto Optimizado**: Gestión inteligente de tokens
- **Memoria Conversacional**: Herramientas de recuperación de contexto
- **TTL Configurable**: Limpieza automática de conversaciones antiguas

### ✅ Sistema de DTOs y Validación

- **Separación API/Dominio**: DTOs específicos para cada capa
- **Validación Robusta**: Zod schemas con mensajes de error claros
- **Type Safety**: Interfaces TypeScript estrictas
- **Error Handling**: Manejo centralizado de errores

### ✅ Herramientas IA

- **Base de Conocimiento**: Búsqueda semántica con Upstash
- **Memoria Conversacional**: Recuperación de contexto histórico
- **Extensibilidad**: Framework para agregar nuevas herramientas

## 🔧 Configuración y Uso

### Prerequisitos

- Node.js 18+ o Bun
- Variables de entorno configuradas (ver `.env.example`)
- Opcionalmente: Redis para almacenamiento persistente

### Instalación

```bash
# Clonar e instalar dependencias
bun install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# Iniciar servidor de desarrollo
bun run dev
```

### Variables de Entorno Críticas

```bash
# Requerido
OPENROUTER_API_KEY=sk-or-v1-...

# Configuración de almacenamiento
STORAGE_TYPE=memory  # o 'redis'

# Para Upstash Redis (recomendado para producción)
# UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
# UPSTASH_REDIS_REST_TOKEN=AXX1AAIncDExxxxxxx
```

### Configuración Rápida de Upstash Redis

**Paso 1**: Crear cuenta gratuita en [Upstash](https://console.upstash.com/redis)

**Paso 2**: Crear nueva base de datos

- Nombre: `ai-chat-storage`
- Región: Elegir la más cercana
- Plan: Gratuito (25,000 requests/mes)

**Paso 3**: Copiar credenciales

```bash
# Desde Upstash Dashboard → Details
UPSTASH_REDIS_REST_URL=https://us1-xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXX1AAIncDExxxxxxx
```

**Paso 4**: Actualizar .env

```bash
STORAGE_TYPE=redis
UPSTASH_REDIS_REST_URL=tu_url_aqui
UPSTASH_REDIS_REST_TOKEN=tu_token_aqui
```

### Uso de la API

```typescript
// Enviar mensaje
POST /api/chat
{
  "prompt": "Genera una imagen de un gato",
  "conversationId": "uuid-v4",
  "taskType": "image",
  "modelType": "simple"
}

// Respuesta
{
  "success": true,
  "data": {
    "id": "response-id",
    "message": "Aquí tienes tu imagen:",
    "images": [{ "type": "image", "imageUrl": { "url": "data:image/..." }}],
    "modelUsed": "google/gemini-2.5-flash-image-preview:free",
    "conversationId": "uuid-v4",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

## 🔄 Migración a Upstash Redis

Para migrar de almacenamiento en memoria a Upstash Redis (serverless):

### 1. Crear cuenta en Upstash

1. Ve a [Upstash Console](https://console.upstash.com/redis)
2. Crea una nueva base de datos Redis
3. Copia la `REST URL` y `REST TOKEN`

### 2. Configurar variables de entorno

```bash
# En .env
STORAGE_TYPE=redis
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token_here
```

### 3. Reiniciar servidor

```bash
bun run dev
```

### 4. Verificar conexión

El servidor automáticamente:

- Intentará conectar a Upstash Redis
- Hará fallback a memoria si falla
- Mostrará logs de estado de conexión

### Ventajas de Upstash Redis

✅ **Serverless**: No necesitas gestionar infraestructura  
✅ **Global**: Edge locations worldwide  
✅ **Pay-per-use**: Solo pagas por lo que uses  
✅ **REST API**: Compatible con cualquier plataforma  
✅ **Persistencia**: Datos seguros y respaldados

## 🧪 Testing y Desarrollo

### Comandos Disponibles

```bash
# Desarrollo
bun run dev          # Servidor con hot reload
bun run build        # Compilar TypeScript
bun run start        # Servidor en producción

# Testing
bun test             # Ejecutar tests unitarios
bun run test:integration  # Tests de integración
bun run test:coverage     # Cobertura de tests

# Linting y formato
bun run lint         # ESLint
bun run format       # Prettier
bun run type-check   # Verificación de tipos
```

### Estructura de Tests

```
tests/
├── unit/
│   ├── services/
│   ├── repositories/
│   └── controllers/
├── integration/
│   └── api/
└── fixtures/
    └── test-data.ts
```

## 📊 Monitoreo y Logging

### Logs Estructurados

```typescript
// Ejemplo de log de request
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "requestId": "req-123",
  "method": "POST",
  "path": "/api/chat",
  "modelUsed": "google/gemini-2.5-flash-image-preview:free",
  "processingTime": "1.2s",
  "status": "success"
}
```

### Métricas de Performance

- Tiempo de respuesta por modelo
- Uso de tokens por conversación
- Rate de errores por endpoint
- Uso de memoria/Redis

## 🔒 Seguridad

### Medidas Implementadas

- **Validación de Input**: Sanitización y validación estricta
- **Rate Limiting**: Límites configurables por IP
- **Error Sanitization**: No exposición de detalles internos
- **Type Safety**: Prevención de errores de tiempo de ejecución

### Recomendaciones Adicionales

- Implementar autenticación API key para producción
- Configurar HTTPS en reverse proxy
- Monitoreo de anomalías en uso de IA
- Backup regular de conversaciones importantes

## 🚀 Roadmap de Mejoras

### Próximas Funcionalidades

- [ ] **Sistema de Cache**: Redis cache para respuestas frecuentes
- [ ] **Streaming Responses**: Respuestas en tiempo real
- [ ] **Multi-modal Support**: Audio y video processing
- [ ] **A/B Testing**: Comparación de modelos
- [ ] **Analytics Dashboard**: Métricas y uso en tiempo real

### Optimizaciones Técnicas

- [ ] **Connection Pooling**: Pool de conexiones Redis/DB
- [ ] **Request Batching**: Agrupación de requests similares
- [ ] **Model Warming**: Pre-carga de modelos frecuentes
- [ ] **Horizontal Scaling**: Soporte para múltiples instancias

## 📝 Contribución

### Guías de Desarrollo

1. **Seguir Clean Architecture**: Respetar la separación de capas
2. **Type Safety First**: Definir interfaces antes de implementar
3. **Testing**: Escribir tests para nueva funcionalidad
4. **Documentation**: Documentar APIs y cambios arquitecturales

### Pull Request Process

1. Fork del repositorio
2. Crear feature branch: `git checkout -b feature/nueva-funcionalidad`
3. Implementar con tests
4. Verificar linting y type checking
5. Crear PR con descripción detallada

---

**Versión**: 2.0.0  
**Última actualización**: Enero 2024  
**Licencia**: MITstall dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.21. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
