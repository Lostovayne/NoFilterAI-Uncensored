import { configDotenv } from 'dotenv';
import express from 'express';
import router from './routes';

configDotenv();

const app = express();

app.use(express.json());
app.use('/api/chat', router);

const port = process.env.PORT || 3000;

app.listen(port, () => {
   console.log(`Server is running on http://localhost:${port}`);
});
