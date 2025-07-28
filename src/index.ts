import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import chatRoutes from './routes/chatRoutes';
import documentRoutes from './routes/documentRoutes';

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

app.use('/api/chat', chatRoutes);
app.use('/api/documents', documentRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});