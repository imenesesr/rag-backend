import pdf from 'pdf-parse';
import { embedAndStoreChunks, getDocumentsByUserId, deleteDocumentById } from './vectorDBService';

const parseAndChunkPDF = async (file: Express.Multer.File): Promise<any[]> => {
  // This is a way to get text from each page individually using a callback.
  // We collect the text of each page into the `pageTexts` array.
  const pageTexts: string[] = [];
  await pdf(file.buffer, {
    async pagerender(pageData) {
      const textContent = await pageData.getTextContent();
      const pageText = textContent.items.map((item: { str: string }) => item.str).join(' ');
      pageTexts.push(pageText);
      // Return an empty string as we are handling text aggregation ourselves.
      return "";
    }
  });

  const allChunks: { page_number: number; chunk_text: string }[] = [];
  // Using a slightly larger chunk size and overlap can help maintain context for legal documents.
  const chunkSize = 1500;
  const chunkOverlap = 200;

  // Now, iterate through the text of each page and create chunks.
  for (let i = 0; i < pageTexts.length; i++) {
    const pageText = pageTexts[i];
    const pageNumber = i + 1; // Page numbers are 1-based

    if (!pageText.trim()) {
      continue; // Skip empty pages
    }

    for (let j = 0; j < pageText.length; j += chunkSize - chunkOverlap) {
      const chunkText = pageText.substring(j, j + chunkSize);
      allChunks.push({
        page_number: pageNumber,
        chunk_text: chunkText,
      });
    }
  }

  return allChunks;
};

export const processAndEmbedDocuments = async (files: Express.Multer.File[], userId: string) => {
  for (const file of files) {
    const chunks = await parseAndChunkPDF(file);
    await embedAndStoreChunks(chunks, file.originalname, userId);
  }
};

export const getDocuments = async (userId: string) => {
  return await getDocumentsByUserId(userId);
};

export const removeDocument = async (docId: string, userId: string) => {
    return await deleteDocumentById(docId, userId);
};