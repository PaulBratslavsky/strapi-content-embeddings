import { PLUGIN_ID } from "../pluginId";
import qs from "qs";

const API_BASE = `/${PLUGIN_ID}/embeddings`;

interface CreateEmbeddingData {
  title: string;
  content: string;
  collectionType?: string;
  fieldName?: string;
  related?: {
    __type: string;
    id: number;
  };
}

interface EmbeddingsListParams {
  page?: number;
  pageSize?: number;
  filters?: Record<string, any>;
}

export const embeddingsApi = {
  create: async (
    fetchClient: { post: Function },
    data: CreateEmbeddingData
  ) => {
    const response = await fetchClient.post(`${API_BASE}/create-embedding`, {
      data,
    });
    return response.data;
  },

  delete: async (fetchClient: { del: Function }, id: string) => {
    const response = await fetchClient.del(`${API_BASE}/delete-embedding/${id}`);
    return response.data;
  },

  getOne: async (fetchClient: { get: Function }, id: string) => {
    const response = await fetchClient.get(`${API_BASE}/find/${id}`);
    return response.data;
  },

  getAll: async (
    fetchClient: { get: Function },
    params?: EmbeddingsListParams
  ) => {
    const queryString = params ? `?${qs.stringify(params)}` : "";
    const response = await fetchClient.get(`${API_BASE}/find${queryString}`);
    return response.data;
  },

  query: async (fetchClient: { get: Function }, query: string) => {
    const response = await fetchClient.get(
      `${API_BASE}/embeddings-query?${qs.stringify({ query })}`
    );
    return response.data;
  },
};
