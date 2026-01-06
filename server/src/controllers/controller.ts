import type { Core } from "@strapi/strapi";

const PLUGIN_ID = "strapi-content-embeddings";

const controller = ({ strapi }: { strapi: Core.Strapi }) => ({
  async createEmbedding(ctx: any) {
    try {
      const result = await strapi
        .plugin(PLUGIN_ID)
        .service("embeddings")
        .createEmbedding(ctx.request.body);

      ctx.body = result;
    } catch (error: any) {
      ctx.throw(500, error.message || "Failed to create embedding");
    }
  },

  async deleteEmbedding(ctx: any) {
    try {
      const { id } = ctx.params;
      const result = await strapi
        .plugin(PLUGIN_ID)
        .service("embeddings")
        .deleteEmbedding(id);

      ctx.body = result;
    } catch (error: any) {
      ctx.throw(500, error.message || "Failed to delete embedding");
    }
  },

  async updateEmbedding(ctx: any) {
    try {
      const { id } = ctx.params;
      const result = await strapi
        .plugin(PLUGIN_ID)
        .service("embeddings")
        .updateEmbedding(id, ctx.request.body);

      ctx.body = result;
    } catch (error: any) {
      ctx.throw(500, error.message || "Failed to update embedding");
    }
  },

  async getEmbeddings(ctx: any) {
    try {
      const { page, pageSize, filters } = ctx.query;
      const result = await strapi
        .plugin(PLUGIN_ID)
        .service("embeddings")
        .getEmbeddings({
          page: page ? parseInt(page, 10) : 1,
          pageSize: pageSize ? parseInt(pageSize, 10) : 10,
          filters,
        });

      ctx.body = result;
    } catch (error: any) {
      ctx.throw(500, error.message || "Failed to get embeddings");
    }
  },

  async getEmbedding(ctx: any) {
    try {
      const { id } = ctx.params;
      const result = await strapi
        .plugin(PLUGIN_ID)
        .service("embeddings")
        .getEmbedding(id);

      if (!result) {
        ctx.throw(404, "Embedding not found");
      }

      ctx.body = result;
    } catch (error: any) {
      if (error.status === 404) {
        ctx.throw(404, error.message);
      }
      ctx.throw(500, error.message || "Failed to get embedding");
    }
  },

  async queryEmbeddings(ctx: any) {
    try {
      const { query } = ctx.query;
      const result = await strapi
        .plugin(PLUGIN_ID)
        .service("embeddings")
        .queryEmbeddings(query);

      ctx.body = result;
    } catch (error: any) {
      ctx.throw(500, error.message || "Failed to query embeddings");
    }
  },
});

export default controller;
