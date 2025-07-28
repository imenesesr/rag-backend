import { QdrantClient } from '@qdrant/js-client-rest';
import { getEmbedding } from './openaiService';
import { v4 as uuidv4 } from 'uuid';

const client = new QdrantClient({ 
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
    port: null, // For Qdrant Cloud, which uses the default HTTPS port (443)
});
const collectionName = 'documents';

let initializePromise: Promise<void> | null = null;

const initializeCollection = async () => {
    const { collections } = await client.getCollections();
    const collectionExists = collections.find((collection) => collection.name === collectionName);

    if (!collectionExists) {
        await client.createCollection(collectionName, { vectors: { size: 1536, distance: 'Cosine' } });
        console.log(`Collection "${collectionName}" created.`);
    }

    // Ensure the index on 'userId' exists for efficient filtering.
    const collectionInfo = await client.getCollection(collectionName);
    const userIdIndexExists = collectionInfo.payload_schema?.userId;

    if (!userIdIndexExists) {
        await client.createPayloadIndex(collectionName, {
            field_name: 'userId',
            field_schema: 'keyword', // 'keyword' is ideal for exact matching on IDs/strings
            wait: true,
        });
        console.log(`Index on "userId" created for collection "${collectionName}".`);
    }
}

const ensureInitialized = () => {
    if (!initializePromise) {
        initializePromise = initializeCollection().catch(error => {
            console.error('Failed to initialize Qdrant collection:', error);
            // After a failed attempt, allow retrying on the next call.
            initializePromise = null;
            // Re-throw the error to fail any pending operations.
            throw error;
        });
    }
    return initializePromise;
};

export interface PointStruct {
  id: string;
  vector: number[];
  payload: DocumentPayload;
}

export const embedAndStoreChunks = async (chunks: any[], documentName: string, userId: string) => {
  await ensureInitialized();
  const docId = uuidv4();

  const points = await Promise.all(chunks.map(async (chunk, i) => {
    const embedding = await getEmbedding(chunk.chunk_text);
    return {
        id: uuidv4(),
        vector: embedding,
        payload: {
            doc_id: docId,
            document_name: documentName,
            page_number: chunk.page_number,
            chunk_index: i,
            chunk_text: chunk.chunk_text,
            userId: userId
        },
    };
  }));

  if (points.length > 0) {
    await client.upsert(collectionName, {
        wait: true,
        points: points,
    });
  }
};

export const getRelevantContexts = async (query: string, userId: string) => {
  await ensureInitialized();
  const queryEmbedding = await getEmbedding(query);
  const searchResult = await client.search(collectionName, {
    vector: queryEmbedding,
    limit: 5,
    filter: {
        must: [
            {
                key: 'userId',
                match: {
                    value: userId
                }
            }
        ]
    }
  });
  return searchResult;
};

interface DocumentPayload {
    doc_id: string;
    document_name: string;
    page_number: number;
    chunk_index: number;
    chunk_text: string;
    userId: string;
}

// Update usages of ExtendedPointStruct to PointStruct or any
interface GroupedDocument {
    id: string;
    name: string;
    chunks: PointStruct[];
}

export const getDocumentsByUserId = async (userId: string): Promise<GroupedDocument[]> => {
    await ensureInitialized();
    const scrollRequest = {
        filter: {
            must: [
                {
                    key: 'userId',
                    match: {
                        value: userId
                    }
                }
            ]
        },
        limit: 100, // Adjust as needed
        with_payload: true
    };
    console.log(`[vectorDBService] Scrolling documents with filter for userId: ${userId}`, JSON.stringify(scrollRequest.filter, null, 2));
    const result = await client.scroll(collectionName, scrollRequest);

    const documents = result.points
    .map((point: any) => ({
        id: String(point.id), // Ensure id is a string
        vector: point.vector,
        payload: point.payload as DocumentPayload,
    }))
    .reduce((acc: Record<string, GroupedDocument>, point: PointStruct) => {
        const payload = point.payload;

        if (!payload || typeof payload.doc_id !== 'string') {
            console.warn('Point found with missing or invalid doc_id in payload, skipping.', point);
            return acc;
        }

        const docId = payload.doc_id;
        if (!acc[docId]) {
            acc[docId] = { id: docId, name: payload.document_name || 'Unnamed Document', chunks: [] };
        }
        acc[docId].chunks.push(point);
        return acc;
    }, {});

    return Object.values(documents);
};

export const deleteDocumentById = async (docId: string, userId: string) => {
    await ensureInitialized();
    await client.delete(collectionName, {
        filter: {
            must: [
                {
                    key: 'doc_id',
                    match: {
                        value: docId
                    }
                },
                {
                    key: 'userId',
                    match: {
                        value: userId
                    }
                }
            ]
        }
    });
};