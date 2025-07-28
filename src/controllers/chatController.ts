import { Request, Response } from 'express';
import { ragService } from '../services/ragService';

export const handleChat = async (req: Request, res: Response) => {
  try {
    const { userId, message } = req.body;

    if (!userId || !message) {
      return res.status(400).json({ error: 'userId and message are required' });
    }

    const result = await ragService(message, userId);

    res.json(result);
  } catch (error) {
    console.error('Error in handleChat:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};