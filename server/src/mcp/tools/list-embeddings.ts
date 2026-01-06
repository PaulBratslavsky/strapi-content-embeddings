/**
 * List Embeddings Tool
 *
 * Lists all embeddings stored in the database.
 */

import type { Core } from '@strapi/strapi';

export const listEmbeddingsTool = {
  name: 'list_embeddings',
  description:
    'List all embeddings stored in the database. Returns metadata without the full content to avoid context overflow.',
  inputSchema: {
    type: 'object',
    properties: {
      page: {
        type: 'number',
        description: 'Page number (starts at 1)',
        default: 1,
      },
      pageSize: {
        type: 'number',
        description: 'Number of items per page (max: 50)',
        default: 25,
      },
      search: {
        type: 'string',
        description: 'Search filter for title',
      },
    },
    required: [],
  },
};

export async function handleListEmbeddings(
  strapi: Core.Strapi,
  args: { page?: number; pageSize?: number; search?: string }
) {
  const { page = 1, pageSize = 25, search } = args;
  const limit = Math.min(pageSize, 50);

  try {
    // Get the embeddings service
    const embeddingsService = strapi
      .plugin('strapi-content-embeddings')
      .service('embeddings');

    // Build filters
    const filters: any = {};
    if (search) {
      filters.title = { $containsi: search };
    }

    // Fetch embeddings
    const result = await embeddingsService.getEmbeddings({
      page,
      pageSize: limit,
      filters,
    });

    // Format response - exclude large fields
    const embeddings = (result.results || []).map((emb: any) => ({
      id: emb.id,
      documentId: emb.documentId,
      title: emb.title,
      collectionType: emb.collectionType,
      fieldName: emb.fieldName,
      metadata: emb.metadata,
      contentPreview: emb.content?.substring(0, 200) + (emb.content?.length > 200 ? '...' : ''),
      createdAt: emb.createdAt,
      updatedAt: emb.updatedAt,
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              embeddings,
              pagination: result.pagination || {
                page,
                pageSize: limit,
                total: embeddings.length,
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
      `Failed to list embeddings: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
