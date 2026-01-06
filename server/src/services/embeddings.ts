import type { Core } from "@strapi/strapi";
import { pluginManager } from "../plugin-manager";

const PLUGIN_ID = "strapi-content-embeddings";
const CONTENT_TYPE_UID = `plugin::${PLUGIN_ID}.embedding` as const;

export interface CreateEmbeddingData {
  data: {
    title: string;
    content: string;
    collectionType?: string;
    fieldName?: string;
    metadata?: Record<string, any>;
    related?: {
      __type: string;
      id: number;
    };
  };
}

export interface UpdateEmbeddingData {
  data: {
    title?: string;
    content?: string;
    metadata?: Record<string, any>;
  };
}

const embeddings = ({ strapi }: { strapi: Core.Strapi }) => ({
  async createEmbedding(data: CreateEmbeddingData) {
    const { title, content, collectionType, fieldName, metadata, related } = data.data;

    // Build entity data - only include related if it has valid __type and id
    const entityData: Record<string, any> = {
      title,
      content,
      collectionType: collectionType || "standalone",
      fieldName: fieldName || "content",
      metadata: metadata || null,
    };

    // Only add related if both __type and id are provided
    if (related && related.__type && related.id) {
      entityData.related = related;
    }

    // First create the entity in Strapi DB
    const entity = await strapi.documents(CONTENT_TYPE_UID).create({
      data: entityData,
    });

    if (!pluginManager.isInitialized()) {
      console.warn("Plugin manager not initialized, skipping vector embedding");
      return entity;
    }

    try {
      // Create embedding in vector store and get the vector
      const result = await pluginManager.createEmbedding({
        id: entity.documentId,
        title,
        content,
        collectionType: collectionType || "standalone",
        fieldName: fieldName || "content",
      });

      // Update entity with embedding ID and vector
      const updatedEntity = await strapi.documents(CONTENT_TYPE_UID).update({
        documentId: entity.documentId,
        data: {
          embeddingId: result.embeddingId,
          embedding: result.embedding,
        } as any,
      });

      return updatedEntity;
    } catch (error) {
      console.error("Failed to create embedding in vector store:", error);
      // Return the entity even if embedding failed
      return entity;
    }
  },

  async deleteEmbedding(id: number | string) {
    const currentEntry = await strapi.documents(CONTENT_TYPE_UID).findOne({
      documentId: String(id),
    });

    if (!currentEntry) {
      throw new Error(`Embedding with id ${id} not found`);
    }

    // Delete from vector store if plugin is initialized
    if (pluginManager.isInitialized()) {
      try {
        await pluginManager.deleteEmbedding(String(id));
      } catch (error) {
        console.error("Failed to delete from vector store:", error);
      }
    }

    // Delete from Strapi DB
    const deletedEntry = await strapi.documents(CONTENT_TYPE_UID).delete({
      documentId: String(id),
    });

    return deletedEntry;
  },

  async updateEmbedding(id: string, data: UpdateEmbeddingData) {
    const { title, content, metadata } = data.data;

    const currentEntry = await strapi.documents(CONTENT_TYPE_UID).findOne({
      documentId: id,
    });

    if (!currentEntry) {
      throw new Error(`Embedding with id ${id} not found`);
    }

    // Build update data
    const updateData: Record<string, any> = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (metadata !== undefined) updateData.metadata = metadata;

    // If content changed, we need to update the vector embedding
    const contentChanged = content !== undefined && content !== currentEntry.content;

    // Update entity in Strapi DB
    let updatedEntity = await strapi.documents(CONTENT_TYPE_UID).update({
      documentId: id,
      data: updateData,
    });

    // If content changed and plugin is initialized, update the vector
    if (contentChanged && pluginManager.isInitialized()) {
      try {
        // Delete old embedding from vector store
        await pluginManager.deleteEmbedding(id);

        // Create new embedding with updated content
        const result = await pluginManager.createEmbedding({
          id,
          title: title || currentEntry.title,
          content: content,
          collectionType: currentEntry.collectionType || "standalone",
          fieldName: currentEntry.fieldName || "content",
        });

        // Update entity with new embedding data
        updatedEntity = await strapi.documents(CONTENT_TYPE_UID).update({
          documentId: id,
          data: {
            embeddingId: result.embeddingId,
            embedding: result.embedding,
          } as any,
        });
      } catch (error) {
        console.error("Failed to update embedding in vector store:", error);
      }
    }

    return updatedEntity;
  },

  async queryEmbeddings(query: string) {
    if (!query || query.trim() === "") {
      return { error: "Please provide a query" };
    }

    if (!pluginManager.isInitialized()) {
      return { error: "Plugin not initialized. Check your configuration." };
    }

    try {
      const response = await pluginManager.queryEmbedding(query);
      return response;
    } catch (error) {
      console.error("Query failed:", error);
      return { error: "Failed to query embeddings" };
    }
  },

  async getEmbedding(id: number | string) {
    return await strapi.documents(CONTENT_TYPE_UID).findOne({
      documentId: String(id),
    });
  },

  async getEmbeddings(params?: {
    page?: number;
    pageSize?: number;
    filters?: any;
  }) {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const start = (page - 1) * pageSize;

    const [data, totalCount] = await Promise.all([
      strapi.documents(CONTENT_TYPE_UID).findMany({
        limit: pageSize,
        start,
        filters: params?.filters,
      }),
      strapi.documents(CONTENT_TYPE_UID).count({
        filters: params?.filters,
      }),
    ]);

    return {
      data,
      count: data.length,
      totalCount,
    };
  },
});

export default embeddings;
