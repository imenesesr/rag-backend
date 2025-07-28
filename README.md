# RAG Backend Service

This project is a Retrieval-Augmented Generation (RAG) backend built with Node.js, TypeScript, and Express. It enables document upload, semantic search, and chat-based question answering using OpenAI and Qdrant vector database.

## Features

- **Document Upload:** Upload PDF documents for semantic indexing.
- **List Uploaded Documents:** Retrieve a list of uploaded documents for a user.
- **Chat Q&A:** Ask questions and receive answers grounded in your uploaded documents.

## Requirements

- Node.js 20.19.4
- Qdrant vector database (cloud or self-hosted)
- OpenAI API key

## Setup

1. Install dependencies:
   ```sh
   npm install
   ```

2. Create a `.env` file with your environment variables:
   ```
   OPENAI_API_KEY=your_openai_key
   QDRANT_URL=https://your-qdrant-url
   QDRANT_API_KEY=your_qdrant_api_key
   ```

3. Build the project:
   ```sh
   npm run build
   ```

4. Start the server:
   ```sh
   npm start
   ```

## API Endpoints

- **POST `/api/documents/upload`**  
  Upload PDF files (multipart/form-data).  
  Body: `userId`, files.

- **GET `/api/documents?userId=<userId>`**  
  List uploaded documents for a user.

- **POST `/api/chat`**  
  Ask a question.  
  Body: `{ "userId": "...", "message": "..." }`

##