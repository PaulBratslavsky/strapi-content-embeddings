/**
 * Semantic Search Tool
 *
 * Performs vector similarity search to find relevant content.
 */

import type { Core } from '@strapi/strapi';

export const semanticSearchTool = {
  name: 'semantic_search',
  description:
    'TRIGGER: Use when user types "/rag" or asks to search embeddings/content. Search for semantically similar content using vector embeddings. Returns the most relevant documents matching your query based on meaning, not just keywords.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query text to find similar content',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (default: 5, max: 20)',
        default: 5,
      },
    },
    required: ['query'],
  },
};

export async function handleSemanticSearch(
  strapi: Core.Strapi,
  args: { query: string; limit?: number }
) {
  const { query, limit = 5 } = args;
  const maxLimit = Math.min(limit, 20);

  try {
    // Get the plugin manager for vector operations
    const pluginManager = (strapi as any).contentEmbeddingsManager;

    if (!pluginManager) {
      throw new Error('Content embeddings plugin not initialized');
    }

    // Perform similarity search
    const results = await pluginManager.similaritySearch(query, maxLimit);

    // Format results
    const formattedResults = results.map((doc: any, index: number) => ({
      rank: index + 1,
      content: doc.pageContent,
      metadata: doc.metadata,
      score: doc.score || null,
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              query,
              resultCount: formattedResults.length,
              results: formattedResults,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    throw new Error(
      `Semantic search failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
