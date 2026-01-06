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
},]