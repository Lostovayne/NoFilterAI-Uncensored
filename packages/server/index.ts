import { configDotenv } from 'dotenv';
import express from 'express';
import { join } from 'path';
import history from 'connect-history-api-fallback';
import router from './routes';

configDotenv();

const app = express();

app.use(express.json());
// API routes
app.use('/api/chat', router);

// Client build path
const clientDistPath = join(process.cwd(), '../client/dist');

// History API fallback for SPA (must be before static files)
app.use(
   history({
      // Exclude API routes
      rewrites: [
         {
            from: /^\/api\/.*$/,
            to: function (context: any) {
               return context.parsedUrl.pathname;
            },
         },
      ],
   })
);

// Serve static files from client build
app.use(express.static(clientDistPath));

const port = process.env.PORT || 3000;

app.listen(port, () => {
   console.log(`Server is running on http://localhost:${port}`);
});
