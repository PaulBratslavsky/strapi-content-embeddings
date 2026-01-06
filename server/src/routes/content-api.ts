export default [
  {
    method: 'GET',
    path: '/embeddings-query',
    handler: 'controller.queryEmbeddings',
  },
  // MCP routes - auth handled by middleware
  {
    method: 'POST',
    path: '/mcp',
    handler: 'mcp.handle',
    config: {
      auth: false,
      policies: [],
    },
  },
  {
    method: 'GET',
    path: '/mcp',
    handler: 'mcp.handle',
    config: {
      auth: false,
      policies: [],
    },
  },
  {
    method: 'DELETE',
    path: '/mcp',
    handler: 'mcp.handle',
    config: {
      auth: false,
      policies: [],
    },
  },
]