import dotenv from 'dotenv'
dotenv.config({ quiet: true })

import express, { json } from 'express';
import cors from 'cors'
import authRoutes from './routes/auth.js';

const app = express();
app.use(cors())
app.use(json());

app.use('/api/auth', authRoutes);

if (process.env.NODE_ENV !== 'test') {
  app.listen(3000, () => console.log('Backend running on port 3000'));
}

export default app;