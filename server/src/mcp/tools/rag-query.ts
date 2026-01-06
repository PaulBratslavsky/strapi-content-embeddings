/**
 * RAG Query Tool
 *
 * Performs Retrieval-Augmented Generation to answer questions using embedded content.
 */

import type { Core } from '@strapi/strapi';

export const ragQueryTool = {
  name: 'rag_query',
  description:
    'TRIGGER: Use when user types "/rag" followed by a question. Ask a question and get an AI-generated answer based on your embedded content. Uses RAG (Retrieval-Augmented Generation) to find relevant documents and generate a contextual response. This is the PRIMARY tool for /rag queries.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The question or query to answer using embedded content',
      },
      includeSourceDocuments: {
        type: 'boolean',
        description: 'Include the source documents used to generate the answer (default: true)',
        default: true,
      },
    },
    required: ['query'],
  },
};

export async function handleRagQuery(
  strapi: Core.Strapi,
  args: { query: string; includeSourceDocuments?: boolean }
) {
  const { query, includeSourceDocuments = true } = args;

  try {
    // Get the embeddings service
    const embeddingsService = strapi
      .plugin('strapi-content-embeddings')
      .service('embeddings');

    // Perform RAG query
    const result = await embeddingsService.queryEmbeddings(query);

    // Format response
    const response: any = {
      query,
      answer: result.text,
    };

    if (includeSourceDocuments && result.sourceDocuments) {
      response.sourceDocuments = result.sourceDocuments.map((doc: any, index: number) => ({
        rank: index + 1,
        content: doc.pageContent?.substring(0, 500) + (doc.pageContent?.length > 500 ? '...' : ''),
        metadata: doc.metadata,
      }));
      response.sourceCount = result.sourceDocuments.length;
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    throw new Error(
      `RAG query failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
