import type { Core } from "@strapi/strapi";
import { pluginManager } from "../plugin-manager";
import {
  chunkContent,
  formatChunkTitle,
  needsChunking,
  estimateTokens,
} from "../utils/chunking";
import type { PluginConfigSchema } from "../config";

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
    /** Enable chunking for large content (overrides config.autoChunk) */
    autoChunk?: boolean;
  };
}

export interface UpdateEmbeddingData {
  data: {
    title?: string;
    content?: string;
    metadata?: Record<string, any>;
    /** Enable chunking for large content on update (overrides config.autoChunk) */
    autoChunk?: boolean;
  };
}

export interface ChunkedEmbeddingResult {
  /** The parent/first embedding entity */
  entity: any;
  /** All chunk entities created */
  chunks: any[];
  /** Total number of chunks created */
  totalChunks: number;
  /** Whether content was chunked */
  wasChunked: boolean;
}

const embeddings = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Get plugin config with defaults
   */
  getConfig(): PluginConfigSchema {
    const config = strapi.config.get("plugin::strapi-content-embeddings") as PluginConfigSchema || {};
    return {
      chunkSize: config.chunkSize || 4000,
      chunkOverlap: config.chunkOverlap || 200,
      autoChunk: config.autoChunk || false,
      ...config,
    };
  },

  /**
   * Create a single embedding (no chunking)
   */
  async createEmbedding(data: CreateEmbeddingData) {
    const { title, content, collectionType, fieldName, metadata, related, autoChunk } = data.data;
    const config = this.getConfig();

    // Check if chunking should be applied
    const shouldChunk = autoChunk ?? config.autoChunk;
    const chunkSize = config.chunkSize || 4000;

    if (shouldChunk && needsChunking(content, chunkSize)) {
      // Delegate to chunked embedding creation
      const result = await this.createChunkedEmbedding(data);
      // Return the first chunk as the primary entity for backwards compatibility
      return result.entity;
    }

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

  /**
   * Create embeddings with automatic chunking for large content
   * Creates multiple embedding entities, one per chunk
   */
  async createChunkedEmbedding(data: CreateEmbeddingData): Promise<ChunkedEmbeddingResult> {
    const { title, content, collectionType, fieldName, metadata, related } = data.data;
    const config = this.getConfig();

    const chunkSize = config.chunkSize || 4000;
    const chunkOverlap = config.chunkOverlap || 200;

    // Split content into chunks
    const chunks = chunkContent(content, { chunkSize, chunkOverlap });

    if (chunks.length === 0) {
      throw new Error("Content is empty or could not be chunked");
    }

    // If only one chunk, create normally
    if (chunks.length === 1) {
      const entity = await this.createEmbedding({
        data: {
          ...data.data,
          autoChunk: false, // Prevent recursive chunking
        },
      });
      return {
        entity,
        chunks: [entity],
        totalChunks: 1,
        wasChunked: false,
      };
    }

    console.log(`Chunking content into ${chunks.length} parts (chunkSize: ${chunkSize}, overlap: ${chunkOverlap})`);

    const createdChunks: any[] = [];
    let parentDocumentId: string | null = null;

    for (const chunk of chunks) {
      const chunkTitle = formatChunkTitle(title, chunk.chunkIndex, chunk.totalChunks);

      // Build chunk metadata
      const chunkMetadata = {
        ...metadata,
        isChunk: true,
        chunkIndex: chunk.chunkIndex,
        totalChunks: chunk.totalChunks,
        startOffset: chunk.startOffset,
        endOffset: chunk.endOffset,
        originalTitle: title,
        parentDocumentId: parentDocumentId,
        estimatedTokens: estimateTokens(chunk.text),
      };

      // Build entity data
      const entityData: Record<string, any> = {
        title: chunkTitle,
        content: chunk.text,
        collectionType: collectionType || "standalone",
        fieldName: fieldName || "content",
        metadata: chunkMetadata,
      };

      // Only add related to first chunk
      if (chunk.chunkIndex === 0 && related && related.__type && related.id) {
        entityData.related = related;
      }

      // Create entity in Strapi DB
      const entity = await strapi.documents(CONTENT_TYPE_UID).create({
        data: entityData,
      });

      // Store first chunk's documentId as parent reference
      if (chunk.chunkIndex === 0) {
        parentDocumentId = entity.documentId;
      } else {
        // Update metadata with parent reference
        await strapi.documents(CONTENT_TYPE_UID).update({
          documentId: entity.documentId,
          data: {
            metadata: {
              ...chunkMetadata,
              parentDocumentId,
            },
          } as any,
        });
      }

      // Create vector embedding if plugin is initialized
      if (pluginManager.isInitialized()) {
        try {
          const result = await pluginManager.createEmbedding({
            id: entity.documentId,
            title: chunkTitle,
            content: chunk.text,
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

          createdChunks.push(updatedEntity);
        } catch (error) {
          console.error(`Failed to create embedding for chunk ${chunk.chunkIndex}:`, error);
          createdChunks.push(entity);
        }
      } else {
        createdChunks.push(entity);
      }
    }

    return {
      entity: createdChunks[0],
      chunks: createdChunks,
      totalChunks: createdChunks.length,
      wasChunked: true,
    };
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

  /**
   * Find all chunks related to a parent document
   * Returns chunks including the parent itself
   */
  async findRelatedChunks(documentId: string): Promise<any[]> {
    const entry = await strapi.documents(CONTENT_TYPE_UID).findOne({
      documentId,
    });

    if (!entry) {
      return [];
    }

    const metadata = entry.metadata as Record<string, any> | null;

    // Determine the parent document ID
    // If this entry has a parentDocumentId, use that; otherwise this is the parent
    const parentId = metadata?.parentDocumentId || documentId;
    const isChunked = metadata?.isChunk === true;

    // If not a chunked document, return just this entry
    if (!isChunked && !metadata?.parentDocumentId) {
      // Check if this document has children (is a parent)
      const children = await strapi.documents(CONTENT_TYPE_UID).findMany({
        filters: {
          metadata: {
            $containsi: `"parentDocumentId":"${documentId}"`,
          },
        },
      });

      if (children.length === 0) {
        return [entry];
      }
      // This is a parent with children
      return [entry, ...children];
    }

    // Find all chunks with the same parentDocumentId (including the parent)
    const allChunks = await strapi.documents(CONTENT_TYPE_UID).findMany({
      filters: {
        $or: [
          { documentId: parentId },
          {
            metadata: {
              $containsi: `"parentDocumentId":"${parentId}"`,
            },
          },
        ],
      },
    });

    // Sort by chunk index
    return allChunks.sort((a, b) => {
      const aIndex = (a.metadata as any)?.chunkIndex ?? 0;
      const bIndex = (b.metadata as any)?.chunkIndex ?? 0;
      return aIndex - bIndex;
    });
  },

  /**
   * Delete all chunks related to a parent document
   */
  async deleteRelatedChunks(documentId: string): Promise<number> {
    const chunks = await this.findRelatedChunks(documentId);

    for (const chunk of chunks) {
      // Delete from vector store
      if (pluginManager.isInitialized()) {
        try {
          await pluginManager.deleteEmbedding(chunk.documentId);
        } catch (error) {
          console.error(`Failed to delete chunk ${chunk.documentId} from vector store:`, error);
        }
      }

      // Delete from Strapi DB
      await strapi.documents(CONTENT_TYPE_UID).delete({
        documentId: chunk.documentId,
      });
    }

    return chunks.length;
  },

  /**
   * Update embeddings with automatic chunking support
   * Handles re-chunking when content changes and exceeds chunk size
   */
  async updateChunkedEmbedding(
    id: string,
    data: UpdateEmbeddingData
  ): Promise<ChunkedEmbeddingResult> {
    const { title, content, metadata, autoChunk } = data.data;
    const config = this.getConfig();

    // Find the current entry
    const currentEntry = await strapi.documents(CONTENT_TYPE_UID).findOne({
      documentId: id,
    });

    if (!currentEntry) {
      throw new Error(`Embedding with id ${id} not found`);
    }

    const currentMetadata = currentEntry.metadata as Record<string, any> | null;
    const parentDocumentId = currentMetadata?.parentDocumentId || id;

    // Determine new content
    const newContent = content ?? currentEntry.content;
    const newTitle = title ?? currentMetadata?.originalTitle ?? currentEntry.title;

    // Check if new content needs chunking
    const shouldChunk = autoChunk ?? config.autoChunk;
    const chunkSize = config.chunkSize || 4000;
    const contentNeedsChunking = shouldChunk && needsChunking(newContent, chunkSize);

    // Find all related chunks to get original relationship info
    const existingChunks = await this.findRelatedChunks(id);

    // Extract the original related info from the first chunk (index 0)
    let originalRelated: { __type: string; id: number } | undefined;
    const firstChunk = existingChunks.find(
      (c) => (c.metadata as any)?.chunkIndex === 0 || c.documentId === parentDocumentId
    );
    if (firstChunk?.related) {
      originalRelated = firstChunk.related;
    }

    // Delete all existing chunks
    const deletedCount = await this.deleteRelatedChunks(id);
    console.log(`Deleted ${deletedCount} existing chunk(s) for update`);

    // Preserve non-chunk metadata
    const preservedMetadata = { ...metadata };
    // Remove chunk-specific fields that will be regenerated
    delete preservedMetadata?.isChunk;
    delete preservedMetadata?.chunkIndex;
    delete preservedMetadata?.totalChunks;
    delete preservedMetadata?.startOffset;
    delete preservedMetadata?.endOffset;
    delete preservedMetadata?.originalTitle;
    delete preservedMetadata?.parentDocumentId;
    delete preservedMetadata?.estimatedTokens;

    // Create new embedding(s)
    if (contentNeedsChunking) {
      // Create chunked embeddings
      return await this.createChunkedEmbedding({
        data: {
          title: newTitle.replace(/\s*\[Part \d+\/\d+\]$/, ''), // Remove old part suffix
          content: newContent,
          collectionType: currentEntry.collectionType || "standalone",
          fieldName: currentEntry.fieldName || "content",
          metadata: preservedMetadata,
          related: originalRelated,
          autoChunk: true,
        },
      });
    } else {
      // Create single embedding
      const entity = await this.createEmbedding({
        data: {
          title: newTitle.replace(/\s*\[Part \d+\/\d+\]$/, ''), // Remove old part suffix
          content: newContent,
          collectionType: currentEntry.collectionType || "standalone",
          fieldName: currentEntry.fieldName || "content",
          metadata: preservedMetadata,
          related: originalRelated,
          autoChunk: false,
        },
      });

      return {
        entity,
        chunks: [entity],
        totalChunks: 1,
        wasChunked: false,
      };
    }
  },

  async updateEmbedding(id: string, data: UpdateEmbeddingData) {
    const { title, content, metadata, autoChunk } = data.data;
    const config = this.getConfig();

    const currentEntry = await strapi.documents(CONTENT_TYPE_UID).findOne({
      documentId: id,
    });

    if (!currentEntry) {
      throw new Error(`Embedding with id ${id} not found`);
    }

    const currentMetadata = currentEntry.metadata as Record<string, any> | null;
    const isCurrentlyChunked = currentMetadata?.isChunk === true;
    const hasRelatedChunks = currentMetadata?.parentDocumentId || isCurrentlyChunked;

    // Determine if we need chunked update
    const shouldChunk = autoChunk ?? config.autoChunk;
    const chunkSize = config.chunkSize || 4000;
    const newContent = content ?? currentEntry.content;
    const contentNeedsChunking = shouldChunk && needsChunking(newContent, chunkSize);
    const contentChanged = content !== undefined && content !== currentEntry.content;

    // Delegate to chunked update if:
    // 1. The entry is currently part of a chunk group, OR
    // 2. The new content needs chunking
    if (hasRelatedChunks || contentNeedsChunking) {
      const result = await this.updateChunkedEmbedding(id, data);
      return result.entity;
    }

    // Simple update for non-chunked content
    const updateData: Record<string, any> = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (metadata !== undefined) updateData.metadata = metadata;

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
