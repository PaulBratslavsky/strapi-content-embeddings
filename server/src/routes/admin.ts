export default [
{
  method: 'POST',
  path: '/embeddings/create-embedding',
  handler: 'controller.createEmbedding',
  config: {
    policies: [
      {
        name: 'admin::hasPermissions',
        config: { actions: ['plugin::strapi-content-embeddings.create'] }
      },
    ]
  },
},
{
  method: 'DELETE',
  path: '/embeddings/delete-embedding/:id',
  handler: 'controller.deleteEmbedding',
  config: {
    policies: [
      {
        name: 'admin::hasPermissions',
        config: { actions: ['plugin::strapi-content-embeddings.delete'] }
      },
    ]
  },
},
{
  method: 'PUT',
  path: '/embeddings/update-embedding/:id',
  handler: 'controller.updateEmbedding',
  config: {
    policies: [
      {
        name: 'admin::hasPermissions',
        config: { actions: ['plugin::strapi-content-embeddings.update'] }
      },
    ]
  },
},
{
  method: 'GET',
  path: '/embeddings/embeddings-query',
  handler: 'controller.queryEmbeddings',
  config: {
    policies: [
      {
        name: 'admin::hasPermissions',
        config: { actions: ['plugin::strapi-content-embeddings.chat'] }
      },
    ]
  },
},
{
  method: 'GET',
  path: '/embeddings/find/:id',
  handler: 'controller.getEmbedding',
  config: {
    policies: [
      {
        name: 'admin::hasPermissions',
        config: { actions: ['plugin::strapi-content-embeddings.read'] }
      },
    ]
  },
},
{
  method: 'GET',
  path: '/embeddings/find',
  handler: 'controller.getEmbeddings',
  config: {
    policies: [
      {
        name: 'admin::hasPermissions',
        config: { actions: ['plugin::strapi-content-embeddings.read'] }
      },
    ]
  },
},
{
  method: 'GET',
  path: '/embeddings/related-chunks/:id',
  handler: 'controller.getRelatedChunks',
  config: {
    policies: [
      {
        name: 'admin::hasPermissions',
        config: { actions: ['plugin::strapi-content-embeddings.read'] }
      },
    ]
  },
},
{
  method: 'GET',
  path: '/debug/neon',
  handler: 'controller.debugNeon',
  config: {
    policies: [
      {
        name: 'admin::hasPermissions',
        config: { actions: ['plugin::strapi-content-embeddings.read'] }
      },
    ]
  },
},
{
  method: 'POST',
  path: '/recreate',
  handler: 'controller.recreateEmbeddings',
  config: {
    policies: [
      {
        name: 'admin::hasPermissions',
        config: { actions: ['plugin::strapi-content-embeddings.update'] }
      },
    ]
  },
},
{
  method: 'GET',
  path: '/sync/status',
  handler: 'controller.getSyncStatus',
  config: {
    policies: [
      {
        name: 'admin::hasPermissions',
        config: { actions: ['plugin::strapi-content-embeddings.read'] }
      },
    ]
  },
},
{
  method: 'POST',
  path: '/sync',
  handler: 'controller.syncFromNeon',
  config: {
    policies: [
      {
        name: 'admin::hasPermissions',
        config: { actions: ['plugin::strapi-content-embeddings.update'] }
      },
    ]
  },
},]