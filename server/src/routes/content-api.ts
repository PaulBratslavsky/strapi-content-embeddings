export default [
  {
    method: 'GET',
    path: '/embeddings-query',
    handler: 'controller.queryEmbeddings',
  },
  // Sync routes - for cron jobs or manual triggering
  // Use API token for authentication
  {
    method: 'GET',
    path: '/sync',
    handler: 'controller.syncFromNeon',
    config: {
      description: 'Sync embeddings from Neon DB to Strapi. Query params: removeOrphans=true, dryRun=true',
    },
  },
  {
    method: 'POST',
    path: '/sync',
    handler: 'controller.syncFromNeon',
    config: {
      description: 'Sync embeddings from Neon DB to Strapi. Query params: removeOrphans=true, dryRun=true',
    },
  },
  {
    method: 'GET',
    path: '/sync/status',
    handler: 'controller.getSyncStatus',
    config: {
      description: 'Get sync status between Neon and Strapi without making changes',
    },
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