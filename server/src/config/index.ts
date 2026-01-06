// Available OpenAI embedding models and their dimensions
export const EMBEDDING_MODELS = {
  "text-embedding-3-small": { dimensions: 1536 },
  "text-embedding-3-large": { dimensions: 3072 },
  "text-embedding-ada-002": { dimensions: 1536 },
} as const;

export type EmbeddingModelName = keyof typeof EMBEDDING_MODELS;

export interface PluginConfigSchema {
  openAIApiKey?: string;
  neonConnectionString?: string;
  embeddingModel?: EmbeddingModelName;
}

export default {
  default: {
    openAIApiKey: "",
    neonConnectionString: "",
    embeddingModel: "text-embedding-3-small" as EmbeddingModelName,
  },
  validator(config: PluginConfigSchema) {
    if (!config.openAIApiKey) {
      console.warn(
        "strapi-content-embeddings: openAIApiKey is not configured. Plugin features will be disabled."
      );
    }
    if (!config.neonConnectionString) {
      console.warn(
        "strapi-content-embeddings: neonConnectionString is not configured. Plugin features will be disabled."
      );
    }
    if (config.embeddingModel && !EMBEDDING_MODELS[config.embeddingModel]) {
      console.warn(
        `strapi-content-embeddings: Invalid embeddingModel "${config.embeddingModel}". ` +
        `Valid options: ${Object.keys(EMBEDDING_MODELS).join(", ")}. ` +
        `Defaulting to "text-embedding-3-small".`
      );
    }
  },
};
