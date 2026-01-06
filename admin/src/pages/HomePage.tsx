import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Main,
  Box,
  Button,
  TextInput,
  Flex,
  Loader,
} from "@strapi/design-system";
import { Plus, Search } from "@strapi/icons";
import { useIntl } from "react-intl";
import { useFetchClient, Layouts } from "@strapi/strapi/admin";
import qs from "qs";

import { PLUGIN_ID } from "../pluginId";
import { EmptyState } from "../components/custom/EmptyState";
import { EmbeddingsTable } from "../components/custom/EmbeddingsTable";
import { ChatModal } from "../components/custom/ChatModal";

interface Embedding {
  id: number;
  documentId: string;
  title: string;
  content?: string;
  embeddingsId?: string;
}

interface EmbeddingsResponse {
  data: Embedding[];
  count: number;
  totalCount: number;
}

function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function HomePage() {
  const { formatMessage } = useIntl();
  const { get } = useFetchClient();
  const navigate = useNavigate();

  const [embeddings, setEmbeddings] = useState<EmbeddingsResponse | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const buildQuery = (searchTerm: string) =>
    qs.stringify({
      filters: searchTerm
        ? {
            $or: [
              { title: { $containsi: searchTerm } },
              { content: { $containsi: searchTerm } },
            ],
          }
        : undefined,
    });

  const fetchData = useCallback(
    async (searchTerm: string) => {
      setIsLoading(true);
      try {
        const response = await get(
          `/${PLUGIN_ID}/embeddings/find?${buildQuery(searchTerm)}`
        );
        setEmbeddings(response.data as EmbeddingsResponse);
      } catch (error) {
        console.error("Failed to fetch embeddings:", error);
        setEmbeddings({ data: [], count: 0, totalCount: 0 });
      } finally {
        setIsLoading(false);
      }
    },
    [get]
  );

  const debouncedFetch = useMemo(
    () => debounce(fetchData, 500),
    [fetchData]
  );

  useEffect(() => {
    debouncedFetch(search);
  }, [search, debouncedFetch]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleCreateNew = () => {
    navigate(`/plugins/${PLUGIN_ID}/embeddings`);
  };

  if (isLoading && !embeddings) {
    return (
      <Main>
        <Layouts.Header
          title={formatMessage({
            id: "HomePage.header.title",
            defaultMessage: "Content Embeddings",
          })}
          subtitle={formatMessage({
            id: "HomePage.header.subtitle",
            defaultMessage: "Manage your content embeddings",
          })}
        />
        <Layouts.Content>
          <Flex justifyContent="center" padding={8}>
            <Loader>Loading...</Loader>
          </Flex>
        </Layouts.Content>
        <ChatModal />
      </Main>
    );
  }

  if (embeddings?.totalCount === 0 && !search) {
    return (
      <Main>
        <Layouts.Header
          title={formatMessage({
            id: "HomePage.header.title",
            defaultMessage: "Content Embeddings",
          })}
          subtitle={formatMessage({
            id: "HomePage.header.subtitle",
            defaultMessage: "Manage your content embeddings",
          })}
        />
        <Layouts.Content>
          <EmptyState />
        </Layouts.Content>
        <ChatModal />
      </Main>
    );
  }

  return (
    <Main>
      <Layouts.Header
        title={formatMessage({
          id: "HomePage.header.title",
          defaultMessage: "Content Embeddings",
        })}
        subtitle={`${embeddings?.count || 0} results found`}
        primaryAction={
          <Button startIcon={<Plus />} onClick={handleCreateNew}>
            Create new embedding
          </Button>
        }
      />
      <Layouts.Content>
        <Box paddingBottom={4}>
          <TextInput
            placeholder="Search embeddings..."
            name="search"
            value={search}
            onChange={handleSearchChange}
            startAction={<Search />}
          />
        </Box>
        {isLoading ? (
          <Flex justifyContent="center" padding={8}>
            <Loader>Loading...</Loader>
          </Flex>
        ) : embeddings?.data && embeddings.data.length > 0 ? (
          <EmbeddingsTable data={embeddings.data} />
        ) : (
          <Box padding={8} textAlign="center">
            No embeddings found matching "{search}"
          </Box>
        )}
      </Layouts.Content>
      <ChatModal />
    </Main>
  );
}
