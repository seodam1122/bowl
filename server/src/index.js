import express from 'express';
import cors from 'cors';
import { initDb } from './db.js';
import { registerRoutes } from './routes.js';

initDb();

const app = express();
app.use(cors());
app.use(express.json());

registerRoutes(app);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`OnScoring API http://localhost:${PORT}`);
});
