import type { Core } from "@strapi/strapi";

const PLUGIN_ID = "strapi-content-embeddings";

const controller = ({ strapi }: { strapi: Core.Strapi }) => ({
  async createEmbedding(ctx: any) {
    try {
      console.log("[createEmbedding] Starting, autoChunk:", ctx.request.body?.data?.autoChunk);

      const result = await strapi
        .plugin(PLUGIN_ID)
        .service("embeddings")
        .createEmbedding(ctx.request.body);

      console.log("[createEmbedding] Completed, documentId:", result?.documentId);

      ctx.body = result;
    } catch (error: any) {
      console.error("[createEmbedding] Error:", error.message);
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
   * Get all chunks related to a document
   * GET /api/strapi-content-embeddings/embeddings/related-chunks/:id
   */
  async getRelatedChunks(ctx: any) {
    try {
      const { id } = ctx.params;
      const result = await strapi
        .plugin(PLUGIN_ID)
        .service("embeddings")
        .findRelatedChunks(id);

      console.log(`[getRelatedChunks] Found ${result.length} chunks for document ${id}`);

      ctx.body = {
        data: result,
        count: result.length,
      };
    } catch (error: any) {
      ctx.throw(500, error.message || "Failed to get related chunks");
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

  /**
   * Debug endpoint to inspect Neon DB contents
   * GET /api/strapi-content-embeddings/debug/neon
   */
  async debugNeon(ctx: any) {
    try {
      const { pluginManager } = require("../plugin-manager");
      const result = await pluginManager.debugNeonEmbeddings();

      ctx.body = {
        count: result.length,
        embeddings: result,
      };
    } catch (error: any) {
      ctx.throw(500, error.message || "Failed to debug Neon");
    }
  },

  /**
   * Recreate all embeddings in Neon from Strapi data
   * POST /api/strapi-content-embeddings/recreate
   *
   * Use this when embeddings were created with incorrect metadata format
   * WARNING: This will delete ALL existing Neon embeddings and recreate them
   */
  async recreateEmbeddings(ctx: any) {
    try {
      console.log("[recreateEmbeddings] Starting recreation of all embeddings...");

      const result = await strapi
        .plugin(PLUGIN_ID)
        .service("sync")
        .recreateAllEmbeddings();

      ctx.body = result;
    } catch (error: any) {
      console.error("[recreateEmbeddings] Error:", error.message);
      ctx.throw(500, error.message || "Failed to recreate embeddings");
    }
  },
});

export default controller;
