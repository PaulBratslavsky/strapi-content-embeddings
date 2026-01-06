/**
 * MCP Tools for Content Embeddings
 *
 * Exposes vector search, RAG queries, and embedding management tools.
 */

import type { Core } from '@strapi/strapi';
import { validateToolInput } from '../schemas';

// Import tool handlers
import { semanticSearchTool, handleSemanticSearch } from './semantic-search';
import { ragQueryTool, handleRagQuery } from './rag-query';
import { listEmbeddingsTool, handleListEmbeddings } from './list-embeddings';
import { getEmbeddingTool, handleGetEmbedding } from './get-embedding';
import { createEmbeddingTool, handleCreateEmbedding } from './create-embedding';

// Export all tool definitions
export const tools = [
  semanticSearchTool,
  ragQueryTool,
  listEmbeddingsTool,
  getEmbeddingTool,
  createEmbeddingTool,
];

// Tool handler registry
const toolHandlers: Record<
  string,
  (strapi: Core.Strapi, args: unknown) => Promise<any>
> = {
  semantic_search: handleSemanticSearch,
  rag_query: handleRagQuery,
  list_embeddings: handleListEmbeddings,
  get_embedding: handleGetEmbedding,
  create_embedding: handleCreateEmbedding,
};

/**
 * Handle MCP tool calls
 */
export async function handleToolCall(
  strapi: Core.Strapi,
  request: { params: { name: string; arguments?: unknown } }
) {
  const { name, arguments: args } = request.params;

  const handler = toolHandlers[name];
  if (!handler) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: true,
            message: `Unknown tool: ${name}`,
            availableTools: Object.keys(toolHandlers),
          }),
        },
      ],
    };
  }

  try {
    // Validate input using Zod schemas
    const validatedArgs = validateToolInput(name, args || {});
    const result = await handler(strapi, validatedArgs);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    strapi.log.error(`[strapi-content-embeddings] Tool ${name} error:`, { error: errorMessage });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: true,
            tool: name,
            message: errorMessage,
          }, null, 2),
        },
      ],
    };
  }
}
