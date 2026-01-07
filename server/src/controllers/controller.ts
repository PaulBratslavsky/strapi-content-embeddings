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

  /**
   * Sync embeddings from Neon DB to Strapi DB
   * GET /api/strapi-content-embeddings/sync
   *
   * Query params:
   * - removeOrphans: boolean (default: false) - Remove Strapi entries that don't exist in Neon
   * - dryRun: boolean (default: false) - Preview changes without applying them
   */
  async syncFromNeon(ctx: any) {
    try {
      const { removeOrphans, dryRun } = ctx.query;

      const result = await strapi
        .plugin(PLUGIN_ID)
        .service("sync")
        .syncFromNeon({
          removeOrphans: removeOrphans === "true",
          dryRun: dryRun === "true",
        });

      ctx.body = result;
    } catch (error: any) {
      ctx.throw(500, error.message || "Failed to sync embeddings");
    }
  },

  /**
   * Get sync status - compare Neon and Strapi without making changes
   * GET /api/strapi-content-embeddings/sync/status
   */
  async getSyncStatus(ctx: any) {
    try {
      const result = await strapi
        .plugin(PLUGIN_ID)
        .service("sync")
        .getSyncStatus();

      ctx.body = result;
    } catch (error: any) {
      ctx.throw(500, error.message || "Failed to get sync status");
    }
  },
});

export default controller;
