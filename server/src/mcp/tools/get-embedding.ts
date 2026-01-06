/**
 * Get Embedding Tool
 *
 * Retrieves a single embedding by ID.
 */

import type { Core } from '@strapi/strapi';

export const getEmbeddingTool = {
  name: 'get_embedding',
  description:
    'Get a specific embedding by its document ID. Returns the full content and metadata.',
  inputSchema: {
    type: 'object',
    properties: {
      documentId: {
        type: 'string',
        description: 'The document ID of the embedding to retrieve',
      },
      includeContent: {
        type: 'boolean',
        description: 'Include the full content text (default: true)',
        default: true,
      },
    },
    required: ['documentId'],
  },
};

export async function handleGetEmbedding(
  strapi: Core.Strapi,
  args: { documentId: string; includeContent?: boolean }
) {
  const { documentId, includeContent = true } = args;

  try {
    // Get the embeddings service
    const embeddingsService = strapi
      .plugin('strapi-content-embeddings')
      .service('embeddings');

    // Fetch the embedding
    const embedding = await embeddingsService.getEmbedding(documentId);

    if (!embedding) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: true,
              message: `Embedding not found with documentId: ${documentId}`,
            }),
          },
        ],
      };
    }

    // Format response
    const result: any = {
      id: embedding.id,
      documentId: embedding.documentId,
      title: embedding.title,
      collectionType: embedding.collectionType,
      fieldName: embedding.fieldName,
      metadata: embedding.metadata,
      embeddingId: embedding.embeddingId,
      createdAt: embedding.createdAt,
      updatedAt: embedding.updatedAt,
    };

    if (includeContent) {
      result.content = embedding.content;
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    throw new Error(
      `Failed to get embedding: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
