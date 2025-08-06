import dotenv from 'dotenv';
dotenv.config();

import express, { Express } from 'express';
import cors, { CorsOptions } from 'cors';
import chatRoutes from './routes/chatRoutes';
import documentRoutes from './routes/documentRoutes';

const app: Express = express();
const port = process.env.PORT || 8080;

// CORS Whitelist Configuration
const whitelist = process.env.CORS_WHITELIST?.split(',') || [];

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    // or from origins in the whitelist.
    if (!origin || whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
};

app.use(cors(corsOptions));

app.use(express.json());

app.use('/api/chat', chatRoutes);
app.use('/api/documents', documentRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});