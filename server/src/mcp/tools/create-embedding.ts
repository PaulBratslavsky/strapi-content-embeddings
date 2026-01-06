/**
 * Create Embedding Tool
 *
 * Creates a new embedding from text content.
 */

import type { Core } from '@strapi/strapi';

export const createEmbeddingTool = {
  name: 'create_embedding',
  description:
    'Create a new embedding from text content. The content will be vectorized and stored for semantic search.',
  inputSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'A descriptive title for the embedding',
      },
      content: {
        type: 'string',
        description: 'The text content to embed (will be vectorized)',
      },
      metadata: {
        type: 'object',
        description: 'Optional metadata to associate with the embedding (tags, source, etc.)',
      },
    },
    required: ['title', 'content'],
  },
};

export async function handleCreateEmbedding(
  strapi: Core.Strapi,
  args: { title: string; content: string; metadata?: Record<string, any> }
) {
  const { title, content, metadata } = args;

  try {
    // Get the embeddings service
    const embeddingsService = strapi
      .plugin('strapi-content-embeddings')
      .service('embeddings');

    // Create the embedding
    const embedding = await embeddingsService.createEmbedding({
      title,
      content,
      metadata: metadata || {},
      collectionType: 'standalone',
      fieldName: 'content',
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              message: 'Embedding created successfully',
              embedding: {
                id: embedding.id,
                documentId: embedding.documentId,
                title: embedding.title,
                embeddingId: embedding.embeddingId,
                contentLength: content.length,
                metadata: embedding.metadata,
                createdAt: embedding.createdAt,
              },
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    throw new Error(
      `Failed to create embedding: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
