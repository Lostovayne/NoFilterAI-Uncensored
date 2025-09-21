import { configDotenv } from 'dotenv';
import express from 'express';
import { existsSync } from 'fs';
import { join } from 'path';
import router from './routes';

configDotenv();

const app = express();

app.use(express.json());

// API routes
app.use('/api/chat', router);

// Servir imágenes generadas
app.use('/generated-images', express.static(join(process.cwd(), 'generated-images')));

// Servir audios generados
app.use('/generated-audio', express.static(join(process.cwd(), 'generated-audio')));

// Servir videos generados
app.use('/generated-videos', express.static(join(process.cwd(), 'generated-videos')));

// Health check endpoint
app.get('/health', (req, res) => {
   res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      storage: process.env.STORAGE_TYPE || 'memory',
      redis_configured: !!(
         process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
      ),
   });
});

// Client build path
const clientDistPath = join(process.cwd(), '../client/dist');
const indexHtmlPath = join(clientDistPath, 'index.html');

// Check if client build exists
const hasClientBuild = existsSync(indexHtmlPath);
if (hasClientBuild) {
   console.log('✅ Client build found, serving static files from:', clientDistPath);

   // Serve static files from client build
   app.use(express.static(clientDistPath));

   // SPA fallback middleware - MUST be at the end
   app.use((req, res, next) => {
      // Don't interfere with API routes
      if (req.path.startsWith('/api/') || req.path === '/health') {
         return next();
      }

      // For all other routes, serve the SPA
      res.sendFile(indexHtmlPath);
   });
} else {
   console.log('⚠️  Client build not found at:', clientDistPath);
   console.log('   The server will only serve API endpoints.');

   // Fallback for non-API routes when no client build
   app.use((req, res, next) => {
      if (req.path.startsWith('/api/') || req.path === '/health') {
         return next();
      }

      res.status(404).json({
         error: 'Client build not found',
         message: 'Please build the client application first',
         api_available: true,
         endpoints: {
            chat: 'POST /api/chat',
            health: 'GET /health',
         },
      });
   });
}

const port = process.env.PORT || 3000;

app.listen(port, () => {
   console.log(`🚀 Server is running on http://localhost:${port}`);
   console.log(`📡 API available at http://localhost:${port}/api/chat`);
   console.log(`❤️  Health check at http://localhost:${port}/health`);

   if (hasClientBuild) {
      console.log(`🌐 Client app available at http://localhost:${port}`);
      console.log(`🔄 SPA routing enabled for client-side navigation`);
   } else {
      console.log(`⚠️  Client app not built - only API is available`);
   }
});
