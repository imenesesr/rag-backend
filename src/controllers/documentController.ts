import { Request, Response } from 'express';
import { processAndEmbedDocuments, getDocuments, removeDocument } from '../services/documentService';

export const uploadDocuments = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const userId = req.body.userId;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    await processAndEmbedDocuments(files, userId);

    res.status(201).json({ message: 'Documents uploaded and processed successfully' });
  } catch (error) {
    console.error('Error in uploadDocuments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listDocuments = async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    const documents = await getDocuments(userId);
    res.json(documents);
  } catch (error) {
    console.error('Error in listDocuments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.query.userId as string;
    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }
    await removeDocument(id, userId);
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error in deleteDocument:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};