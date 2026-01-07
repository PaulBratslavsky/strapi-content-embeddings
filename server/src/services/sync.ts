import type { Core } from "@strapi/strapi";
import { pluginManager } from "../plugin-manager";

const PLUGIN_ID = "strapi-content-embeddings";
const CONTENT_TYPE_UID = `plugin::${PLUGIN_ID}.embedding` as const;

export interface SyncResult {
  success: boolean;
  timestamp: string;
  neonCount: number;
  strapiCount: number;
  actions: {
    created: number;
    updated: number;
    orphansRemoved: number;
  };
  details: {
    created: string[];
    updated: string[];
    orphansRemoved: string[];
  };
  errors: string[];
}

interface NeonEmbedding {
  id: string;
  strapiId: string;
  title: string;
  content: string;
  collectionType: string;
  fieldName: string;
}

interface StrapiEmbedding {
  documentId: string;
  title: string;
  content: string;
  embeddingId: string | null;
  collectionType: string;
  fieldName: string;
}

const sync = ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Sync embeddings from Neon DB to Strapi DB
   *
   * This performs the following operations:
   * 1. Fetches all embeddings from Neon DB (source of truth)
   * 2. Fetches all embeddings from Strapi DB
   * 3. Creates missing entries in Strapi that exist in Neon
   * 4. Updates Strapi entries where content differs from Neon
   * 5. Optionally removes orphaned Strapi entries (no matching Neon record)
   */
  async syncFromNeon(options?: {
    removeOrphans?: boolean;
    dryRun?: boolean;
  }): Promise<SyncResult> {
    const { removeOrphans = false, dryRun = false } = options || {};

    const result: SyncResult = {
      success: false,
      timestamp: new Date().toISOString(),
      neonCount: 0,
      strapiCount: 0,
      actions: {
        created: 0,
        updated: 0,
        orphansRemoved: 0,
      },
      details: {
        created: [],
        updated: [],
        orphansRemoved: [],
      },
      errors: [],
    };

    // Check if plugin is initialized
    if (!pluginManager.isInitialized()) {
      result.errors.push(
        "Plugin manager not initialized. Check your Neon and OpenAI configuration."
      );
      return result;
    }

    try {
      // Step 1: Get all embeddings from Neon DB
      const neonEmbeddings = await pluginManager.getAllNeonEmbeddings();
      result.neonCount = neonEmbeddings.length;

      // Step 2: Get all embeddings from Strapi DB
      const strapiEmbeddings = (await strapi
        .documents(CONTENT_TYPE_UID)
        .findMany({
          limit: 10000, // High limit to get all
        })) as unknown as StrapiEmbedding[];
      result.strapiCount = strapiEmbeddings.length;

      // Create lookup maps
      const neonBystrapiId = new Map<string, NeonEmbedding>();
      for (const neon of neonEmbeddings) {
        if (neon.strapiId) {
          neonBystrapiId.set(neon.strapiId, neon);
        }
      }

      const strapiByDocumentId = new Map<string, StrapiEmbedding>();
      for (const strapi of strapiEmbeddings) {
        strapiByDocumentId.set(strapi.documentId, strapi);
      }

      // Step 3: Find Neon embeddings that don't exist in Strapi
      for (const neon of neonEmbeddings) {
        if (!neon.strapiId) {
          // Neon record has no Strapi reference - skip or log
          result.errors.push(
            `Neon embedding ${neon.id} has no strapiId in metadata`
          );
          continue;
        }

        const existingStrapi = strapiByDocumentId.get(neon.strapiId);

        if (!existingStrapi) {
          // Create new Strapi entry
          if (!dryRun) {
            try {
              await strapi.documents(CONTENT_TYPE_UID).create({
                data: {
                  documentId: neon.strapiId,
                  title: neon.title,
                  content: neon.content,
                  embeddingId: neon.id,
                  collectionType: neon.collectionType,
                  fieldName: neon.fieldName,
                } as any,
              });
              result.actions.created++;
              result.details.created.push(
                `${neon.strapiId} (${neon.title || "untitled"})`
              );
            } catch (error) {
              result.errors.push(
                `Failed to create Strapi entry for ${neon.strapiId}: ${error}`
              );
            }
          } else {
            result.actions.created++;
            result.details.created.push(
              `[DRY RUN] ${neon.strapiId} (${neon.title || "untitled"})`
            );
          }
        } else {
          // Check if content needs updating
          const contentChanged = existingStrapi.content !== neon.content;
          const titleChanged = existingStrapi.title !== neon.title;
          const embeddingIdMissing = !existingStrapi.embeddingId;

          if (contentChanged || titleChanged || embeddingIdMissing) {
            if (!dryRun) {
              try {
                await strapi.documents(CONTENT_TYPE_UID).update({
                  documentId: neon.strapiId,
                  data: {
                    title: neon.title,
                    content: neon.content,
                    embeddingId: neon.id,
                  } as any,
                });
                result.actions.updated++;
                result.details.updated.push(
                  `${neon.strapiId} (${neon.title || "untitled"})`
                );
              } catch (error) {
                result.errors.push(
                  `Failed to update Strapi entry ${neon.strapiId}: ${error}`
                );
              }
            } else {
              result.actions.updated++;
              result.details.updated.push(
                `[DRY RUN] ${neon.strapiId} (${neon.title || "untitled"})`
              );
            }
          }
        }
      }

      // Step 4: Handle orphaned Strapi entries (exist in Strapi but not in Neon)
      if (removeOrphans) {
        for (const strapiEmbed of strapiEmbeddings) {
          const hasNeonRecord = neonBystrapiId.has(strapiEmbed.documentId);

          if (!hasNeonRecord) {
            if (!dryRun) {
              try {
                await strapi.documents(CONTENT_TYPE_UID).delete({
                  documentId: strapiEmbed.documentId,
                });
                result.actions.orphansRemoved++;
                result.details.orphansRemoved.push(
                  `${strapiEmbed.documentId} (${strapiEmbed.title || "untitled"})`
                );
              } catch (error) {
                result.errors.push(
                  `Failed to remove orphan ${strapiEmbed.documentId}: ${error}`
                );
              }
            } else {
              result.actions.orphansRemoved++;
              result.details.orphansRemoved.push(
                `[DRY RUN] ${strapiEmbed.documentId} (${strapiEmbed.title || "untitled"})`
              );
            }
          }
        }
      }

      result.success = result.errors.length === 0;
      return result;
    } catch (error) {
      result.errors.push(`Sync failed: ${error}`);
      return result;
    }
  },

  /**
   * Get sync status - compare Neon and Strapi without making changes
   */
  async getSyncStatus(): Promise<{
    neonCount: number;
    strapiCount: number;
    inSync: boolean;
    missingInStrapi: number;
    missingInNeon: number;
    contentDifferences: number;
  }> {
    if (!pluginManager.isInitialized()) {
      throw new Error("Plugin manager not initialized");
    }

    const neonEmbeddings = await pluginManager.getAllNeonEmbeddings();
    const strapiEmbeddings = (await strapi
      .documents(CONTENT_TYPE_UID)
      .findMany({
        limit: 10000,
      })) as unknown as StrapiEmbedding[];

    const neonBystrapiId = new Map<string, NeonEmbedding>();
    for (const neon of neonEmbeddings) {
      if (neon.strapiId) {
        neonBystrapiId.set(neon.strapiId, neon);
      }
    }

    const strapiByDocumentId = new Map<string, StrapiEmbedding>();
    for (const s of strapiEmbeddings) {
      strapiByDocumentId.set(s.documentId, s);
    }

    let missingInStrapi = 0;
    let contentDifferences = 0;

    for (const neon of neonEmbeddings) {
      if (!neon.strapiId) continue;
      const strapiRecord = strapiByDocumentId.get(neon.strapiId);
      if (!strapiRecord) {
        missingInStrapi++;
      } else if (strapiRecord.content !== neon.content) {
        contentDifferences++;
      }
    }

    let missingInNeon = 0;
    for (const s of strapiEmbeddings) {
      if (!neonBystrapiId.has(s.documentId)) {
        missingInNeon++;
      }
    }

    return {
      neonCount: neonEmbeddings.length,
      strapiCount: strapiEmbeddings.length,
      inSync:
        missingInStrapi === 0 &&
        missingInNeon === 0 &&
        contentDifferences === 0,
      missingInStrapi,
      missingInNeon,
      contentDifferences,
    };
  },
});

export default sync;
