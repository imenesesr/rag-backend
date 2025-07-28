import { getRelevantContexts } from './vectorDBService';
import { generateResponse } from './openaiService';


// Define a type for the context objects for better type safety.
// This describes the shape of the data returned from the vector database.
interface ContextItem {
  payload?: {
    document_name: string;
    page_number: number;
    chunk_text: string;
  };
  // You can add other properties from your vector DB response here, like score, id, etc.
}

const buildPromptWithContext = (userQuery: string, context: ContextItem[]): string => {
  const contextString = context.length > 0
    ? context
        .map((c) => `Source: ${c.payload?.document_name || 'Unknown'}\nContent: ${c.payload?.chunk_text || ''}`)
        .join('\n\n---\n\n')
    : "No context provided.";

  return `Usted es un asistente de IA experto en legislación de Ecuador. Su conocimiento se basa exclusivamente en la información cargada en una base de datos documental.
Su tarea es responder la consulta del usuario utilizando *únicamente* el contexto proporcionado.
La respuesta debe ser una cita textual y directa del contexto. No parafrasee ni resuma la información.
Si la información para responder la consulta no se encuentra en el contexto, debe decir "Lo siento, no tengo suficiente información para responder a esa pregunta."
No utilice ningún conocimiento externo.

Contexto:
${contextString}

Consulta del Usuario: ${userQuery}

Respuesta:`;
};

export const ragService = async (userQuery: string, userId: string) => {
   // Get raw points from Qdrant
  const rawContext = await getRelevantContexts(userQuery, userId);
  
    // Map to ContextItem[]
  const context: ContextItem[] = (rawContext ?? []).map((point: any) => ({
    payload: point.payload
      ? {
          document_name: String(point.payload.document_name ?? ''),
          page_number: Number(point.payload.page_number ?? 0),
          chunk_text: String(point.payload.chunk_text ?? ''),
        }
      : undefined,
    // Add other properties if needed
  }));

  const prompt = buildPromptWithContext(userQuery, context);
  console.log('---PROMPT---');
  console.log(prompt);
  console.log('------------');

  const response = await generateResponse(prompt);

  // Normaliza la respuesta del LLM para encontrar el texto citado.
  // Esto elimina los espacios en blanco y las comillas iniciales/finales.
  const normalizedResponse = response?.trim().replace(/^"|"$/g, '').trim();
  const isFactResponse = normalizedResponse && !normalizedResponse.startsWith("Lo siento, no tengo suficiente información");

  let primarySourceChunk: ContextItem | null = null;
  let indexPrimarySourceChunk = -1;

  // Si el LLM dio una respuesta objetiva, intenta encontrar el fragmento de contexto más probable.
  if (isFactResponse && context.length > 0) {
    // Heurística: encontrar el fragmento de contexto que contiene el inicio de la respuesta del LLM.
    // Esto es más flexible que una búsqueda de subcadena exacta.
    // En lugar de buscar la respuesta completa, el nuevo código busca el fragmento de contexto que contenga los primeros 100 caracteres
    const responseStart = normalizedResponse.substring(0, Math.min(normalizedResponse.length, 100));

    for (const chunk of context) {
      indexPrimarySourceChunk++;
      const chunkText = chunk.payload?.chunk_text || '';
      if (chunkText.includes(responseStart)) {
        // Como el contexto está ordenado por relevancia de la búsqueda vectorial,
        // el primer fragmento que contenga el inicio de la respuesta es la fuente principal más probable.
        primarySourceChunk = chunk;
        break; // Salir al encontrar la primera y mejor coincidencia.
      }
    }

    // Si la heurística anterior falla (p. ej., el LLM parafraseó), se usa el resultado
    // de mayor puntuación de la búsqueda vectorial como respaldo.
    if (!primarySourceChunk) {
        primarySourceChunk = context[indexPrimarySourceChunk];
    }
  }

  const primarySourcesMap = new Map<string, { document_name: string; page_number: number }>();
  const linkedSourcesMap = new Map<string, { document_name: string; page_number: number }>();

  if (primarySourceChunk) {
    const docName = primarySourceChunk.payload?.document_name;
    const pageNumber = primarySourceChunk.payload?.page_number ?? 0; // <-- fix here
    if (docName) {
      primarySourcesMap.set(docName, { document_name: docName, page_number: pageNumber });
    }
  }

  // Todas las demás fuentes recuperadas (que no son la fuente principal) se consideran vinculadas.
  context.forEach(c => {
    const docName = c.payload?.document_name;
    const pageNumber = c.payload?.page_number ?? 0; // <-- fix here
    if (docName && !primarySourcesMap.has(docName) && !linkedSourcesMap.has(docName)) {
      linkedSourcesMap.set(docName, { document_name: docName, page_number: pageNumber });
    }
  });

  return {
    response,
    sources: Array.from(primarySourcesMap.values()),
    linked_sources: Array.from(linkedSourcesMap.values()),
  };
};