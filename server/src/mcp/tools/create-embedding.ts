/**
 * Create Embedding Tool
 *
 * Creates a new embedding from text content.
 * Supports automatic chunking for large content.
 */

import type { Core } from '@strapi/strapi';

export const createEmbeddingTool = {
  name: 'create_embedding',
  description:
    'Create a new embedding from text content. The content will be vectorized and stored for semantic search. For large content (over 4000 characters), enable autoChunk to automatically split into multiple embeddings.',
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
      autoChunk: {
        type: 'boolean',
        description:
          'Automatically split large content into chunks (default: false). When enabled, content over 4000 characters will be split into multiple embeddings with overlap for context preservation.',
      },
    },
    required: ['title', 'content'],
  },
};

export async function handleCreateEmbedding(
  strapi: Core.Strapi,
  args: {
    title: string;
    content: string;
    metadata?: Record<string, any>;
    autoChunk?: boolean;
  }
) {
  const { title, content, metadata, autoChunk } = args;

  try {
    // Get the embeddings service
    const embeddingsService = strapi
      .plugin('strapi-content-embeddings')
      .service('embeddings');

    // Check if we should use chunked embedding
    if (autoChunk) {
      const result = await embeddingsService.createChunkedEmbedding({
        data: {
          title,
          content,
          metadata: metadata || {},
          collectionType: 'standalone',
          fieldName: 'content',
        },
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                message: result.wasChunked
                  ? `Content chunked into ${result.totalChunks} embeddings`
                  : 'Embedding created successfully (no chunking needed)',
                wasChunked: result.wasChunked,
                totalChunks: result.totalChunks,
                primaryEmbedding: {
                  id: result.entity.id,
                  documentId: result.entity.documentId,
                  title: result.entity.title,
                  embeddingId: result.entity.embeddingId,
                },
                chunks: result.chunks.map((chunk: any) => ({
                  documentId: chunk.documentId,
                  title: chunk.title,
                  contentLength: chunk.content?.length || 0,
                })),
                contentLength: content.length,
                estimatedTokens: Math.ceil(content.length / 4),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Create single embedding (original behavior)
    const embedding = await embeddingsService.createEmbedding({
      data: {
        title,
        content,
        metadata: metadata || {},
        collectionType: 'standalone',
        fieldName: 'content',
      },
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
              hint:
                content.length > 4000
                  ? 'Content is large. Consider using autoChunk: true for better search results.'
                  : undefined,
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
