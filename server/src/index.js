import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { registerRoutes } from './routes.js';
import { seedIfEmpty } from './seed.js';

const app = express();
app.use(cors());
app.use(express.json());

registerRoutes(app);

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await seedIfEmpty();
  } catch (e) {
    console.error('[seed]', e.message);
  }
  app.listen(PORT, () => {
    console.log(`OnScoring API http://localhost:${PORT} (Supabase)`);
  });
}

start();
