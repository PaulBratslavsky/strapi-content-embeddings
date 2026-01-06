import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { Document } from "@langchain/core/documents";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import {
  RunnableSequence,
  RunnablePassthrough,
} from "@langchain/core/runnables";
import { Pool, PoolConfig } from "pg";
import {
  EMBEDDING_MODELS,
  type EmbeddingModelName,
} from "./config";

interface PluginConfig {
  openAIApiKey: string;
  neonConnectionString: string;
  embeddingModel?: EmbeddingModelName;
}

interface EmbeddingDocument {
  id: string;
  title: string;
  content: string;
  collectionType?: string;
  fieldName?: string;
}

interface CreateEmbeddingResult {
  embeddingId: string;
  embedding: number[];
}

interface QueryResponse {
  text: string;
  sourceDocuments: Document[];
}

class PluginManager {
  private embeddings: OpenAIEmbeddings | null = null;
  private chat: ChatOpenAI | null = null;
  private pool: Pool | null = null;
  private embeddingModel: EmbeddingModelName = "text-embedding-3-small";
  private dimensions: number = 1536;
  private vectorStoreConfig: {
    pool: Pool;
    tableName: string;
    columns: {
      idColumnName: string;
      vectorColumnName: string;
      contentColumnName: string;
      metadataColumnName: string;
    };
    distanceStrategy: "cosine" | "innerProduct" | "euclidean";
  } | null = null;

  async initializePool(connectionString: string): Promise<Pool> {
    console.log("Initializing Neon DB Pool");

    if (this.pool) return this.pool;

    try {
      const poolConfig: PoolConfig = {
        connectionString,
        ssl: { rejectUnauthorized: false },
        max: 10,
      };

      this.pool = new Pool(poolConfig);

      // Test the connection
      const client = await this.pool.connect();
      await client.query("SELECT 1");
      client.release();

      // Initialize the vector store table if it doesn't exist
      await this.initializeVectorTable();

      console.log("Neon DB Pool initialized successfully");
      return this.pool;
    } catch (error) {
      console.error(`Failed to initialize Neon DB Pool: ${error}`);
      throw new Error(`Failed to initialize Neon DB Pool: ${error}`);
    }
  }

  private async initializeVectorTable(): Promise<void> {
    if (!this.pool) throw new Error("Pool not initialized");

    const client = await this.pool.connect();
    try {
      // Enable the pgvector extension
      await client.query("CREATE EXTENSION IF NOT EXISTS vector");

      // Create the documents table if it doesn't exist
      // Note: If you change embedding models with different dimensions,
      // you may need to drop and recreate this table
      await client.query(`
        CREATE TABLE IF NOT EXISTS embeddings_documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          content TEXT,
          metadata JSONB,
          embedding vector(${this.dimensions})
        )
      `);

      // Drop any IVFFlat indexes that may have been created (they cause issues with small datasets)
      await client.query(`
        DROP INDEX IF EXISTS embeddings_documents_embedding_idx
      `);

      // Create HNSW index for similarity search (works better with any dataset size)
      await client.query(`
        CREATE INDEX IF NOT EXISTS embeddings_documents_embedding_hnsw_idx
        ON embeddings_documents
        USING hnsw (embedding vector_cosine_ops)
      `);

      // Create GIN index on metadata for faster lookups
      await client.query(`
        CREATE INDEX IF NOT EXISTS embeddings_documents_metadata_idx
        ON embeddings_documents
        USING gin (metadata)
      `);

      console.log(`Vector table initialized (dimensions: ${this.dimensions})`);
    } catch (error) {
      // Index creation might fail if not enough rows, that's okay
      console.log("Note: Index creation may require more data");
    } finally {
      client.release();
    }
  }

  async initializeEmbeddings(openAIApiKey: string): Promise<OpenAIEmbeddings> {
    console.log(`Initializing OpenAI Embeddings (model: ${this.embeddingModel})`);

    if (this.embeddings) return this.embeddings;

    try {
      this.embeddings = new OpenAIEmbeddings({
        openAIApiKey,
        modelName: this.embeddingModel,
        dimensions: this.dimensions,
      });

      return this.embeddings;
    } catch (error) {
      console.error(`Failed to initialize Embeddings: ${error}`);
      throw new Error(`Failed to initialize Embeddings: ${error}`);
    }
  }

  async initializeChat(openAIApiKey: string): Promise<ChatOpenAI> {
    console.log("Initializing Chat Model");

    if (this.chat) return this.chat;

    try {
      this.chat = new ChatOpenAI({
        modelName: "gpt-4o-mini",
        temperature: 0.7,
        openAIApiKey,
      });

      return this.chat;
    } catch (error) {
      console.error(`Failed to initialize Chat: ${error}`);
      throw new Error(`Failed to initialize Chat: ${error}`);
    }
  }

  async initialize(config: PluginConfig): Promise<void> {
    // Set embedding model and dimensions from config
    const model = config.embeddingModel || "text-embedding-3-small";
    if (EMBEDDING_MODELS[model]) {
      this.embeddingModel = model;
      this.dimensions = EMBEDDING_MODELS[model].dimensions;
    } else {
      console.warn(`Invalid embedding model "${model}", using default`);
      this.embeddingModel = "text-embedding-3-small";
      this.dimensions = EMBEDDING_MODELS["text-embedding-3-small"].dimensions;
    }

    console.log(`Using embedding model: ${this.embeddingModel} (${this.dimensions} dimensions)`);

    await this.initializePool(config.neonConnectionString);
    await this.initializeEmbeddings(config.openAIApiKey);
    await this.initializeChat(config.openAIApiKey);

    if (this.pool) {
      this.vectorStoreConfig = {
        pool: this.pool,
        tableName: "embeddings_documents",
        columns: {
          idColumnName: "id",
          vectorColumnName: "embedding",
          contentColumnName: "content",
          metadataColumnName: "metadata",
        },
        distanceStrategy: "cosine",
      };
    }

    console.log("Plugin Manager Initialization Complete");
  }

  async createEmbedding(docData: EmbeddingDocument): Promise<CreateEmbeddingResult> {
    if (!this.embeddings || !this.vectorStoreConfig) {
      throw new Error("Plugin manager not initialized");
    }

    try {
      // Generate the embedding vector
      const embeddingVector = await this.embeddings.embedQuery(docData.content);

      const doc = new Document({
        pageContent: docData.content,
        metadata: {
          id: docData.id,
          title: docData.title,
          collectionType: docData.collectionType || "standalone",
          fieldName: docData.fieldName || "content",
        },
      });

      await PGVectorStore.fromDocuments(
        [doc],
        this.embeddings,
        this.vectorStoreConfig
      );

      // Get the ID of the inserted document
      const result = await this.pool!.query(
        `SELECT id FROM embeddings_documents
         WHERE metadata->>'id' = $1
         ORDER BY id DESC LIMIT 1`,
        [docData.id]
      );

      return {
        embeddingId: result.rows[0]?.id || "",
        embedding: embeddingVector,
      };
    } catch (error) {
      console.error(`Failed to create embedding: ${error}`);
      throw new Error(`Failed to create embedding: ${error}`);
    }
  }

  async deleteEmbedding(strapiId: string): Promise<void> {
    if (!this.pool) {
      throw new Error("Plugin manager not initialized");
    }

    try {
      await this.pool.query(
        `DELETE FROM embeddings_documents WHERE metadata->>'id' = $1`,
        [strapiId]
      );
    } catch (error) {
      console.error(`Failed to delete embedding: ${error}`);
      throw new Error(`Failed to delete embedding: ${error}`);
    }
  }

  async queryEmbedding(query: string): Promise<QueryResponse> {
    if (!this.embeddings || !this.chat || !this.vectorStoreConfig) {
      throw new Error("Plugin manager not initialized");
    }

    try {
      const vectorStore = await PGVectorStore.initialize(
        this.embeddings,
        this.vectorStoreConfig
      );

      // Use similaritySearchWithScore to get relevance scores
      // Retrieve more documents initially, then filter by score
      const resultsWithScores = await vectorStore.similaritySearchWithScore(query, 6);

      // Filter by similarity threshold (cosine similarity: 0 = identical, 2 = opposite)
      // Keep only documents with score < 0.5 (more similar)
      const SIMILARITY_THRESHOLD = 0.5;
      const relevantResults = resultsWithScores.filter(([_, score]) => score < SIMILARITY_THRESHOLD);

      // Take top 3 most relevant documents for context
      const topResults = relevantResults.slice(0, 3);
      const sourceDocuments = topResults.map(([doc]) => doc);

      // Only show the single best matching source to the user
      const bestMatchForDisplay = topResults.length > 0 ? [topResults[0][0]] : [];

      // Format documents for context - include title from metadata
      const formatDocs = (docs: Document[]): string => {
        return docs.map((doc) => {
          const title = doc.metadata?.title ? `Title: ${doc.metadata.title}\n` : '';
          return `${title}${doc.pageContent}`;
        }).join("\n\n");
      };

      // Create RAG prompt
      const ragPrompt = ChatPromptTemplate.fromMessages([
        [
          "system",
          `You are a helpful assistant that answers questions based on the provided context.
If you cannot find the answer in the context, say so. Be concise and accurate.

Context:
{context}`,
        ],
        ["human", "{question}"],
      ]);

      // Build LCEL chain - use all relevant docs for context
      const ragChain = RunnableSequence.from([
        {
          context: async () => formatDocs(sourceDocuments),
          question: new RunnablePassthrough(),
        },
        ragPrompt,
        this.chat,
        new StringOutputParser(),
      ]);

      const text = await ragChain.invoke(query);

      return {
        text,
        sourceDocuments: bestMatchForDisplay, // Only return best match to display
      };
    } catch (error) {
      console.error(`Failed to query embeddings: ${error}`);
      throw new Error(`Failed to query embeddings: ${error}`);
    }
  }

  async similaritySearch(
    query: string,
    k: number = 4
  ): Promise<Document[]> {
    if (!this.embeddings || !this.vectorStoreConfig) {
      throw new Error("Plugin manager not initialized");
    }

    try {
      const vectorStore = await PGVectorStore.initialize(
        this.embeddings,
        this.vectorStoreConfig
      );

      return await vectorStore.similaritySearch(query, k);
    } catch (error) {
      console.error(`Failed to perform similarity search: ${error}`);
      throw new Error(`Failed to perform similarity search: ${error}`);
    }
  }

  isInitialized(): boolean {
    return !!(this.embeddings && this.chat && this.pool);
  }

  async destroy(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
    this.embeddings = null;
    this.chat = null;
    this.vectorStoreConfig = null;
  }
}

export const pluginManager = new PluginManager();
export type { PluginConfig, EmbeddingDocument, QueryResponse, CreateEmbeddingResult };
