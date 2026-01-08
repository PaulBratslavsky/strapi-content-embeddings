import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Main,
  Box,
  Button,
  TextInput,
  Flex,
  Loader,
  Typography,
  Pagination,
  PreviousLink,
  PageLink,
  NextLink,
} from '@strapi/design-system';
import { Plus, Search } from '@strapi/icons';
import { useFetchClient, Layouts } from '@strapi/strapi/admin';
import qs from 'qs';

import { PLUGIN_ID } from '../pluginId';
import { EmptyState } from '../components/custom/EmptyState';
import { EmbeddingsTable } from '../components/custom/EmbeddingsTable';
import { ChatModal } from '../components/custom/ChatModal';

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

const PAGE_SIZE = 10;

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
  const { get } = useFetchClient();
  const navigate = useNavigate();

  const [embeddings, setEmbeddings] = useState<EmbeddingsResponse | null>(null);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = embeddings ? Math.ceil(embeddings.totalCount / PAGE_SIZE) : 0;

  const buildQuery = (searchTerm: string, page: number) =>
    qs.stringify({
      page,
      pageSize: PAGE_SIZE,
      filters: searchTerm
        ? {
            $or: [{ title: { $containsi: searchTerm } }, { content: { $containsi: searchTerm } }],
          }
        : undefined,
    });

  const fetchData = useCallback(
    async (searchTerm: string, page: number) => {
      setIsLoading(true);
      try {
        const response = await get(`/${PLUGIN_ID}/embeddings/find?${buildQuery(searchTerm, page)}`);
        setEmbeddings(response.data as EmbeddingsResponse);
      } catch (error) {
        console.error('Failed to fetch embeddings:', error);
        setEmbeddings({ data: [], count: 0, totalCount: 0 });
      } finally {
        setIsLoading(false);
      }
    },
    [get]
  );

  const debouncedFetch = useMemo(() => debounce(fetchData, 500), [fetchData]);

  useEffect(() => {
    debouncedFetch(search, currentPage);
  }, [search, currentPage, debouncedFetch]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleCreateNew = () => {
    navigate(`/plugins/${PLUGIN_ID}/embeddings`);
  };

  if (isLoading && !embeddings) {
    return (
      <Main>
        <Layouts.Header title={'Content Embeddings'} subtitle={'Manage your content embeddings'} />
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
        <Layouts.Header title={'Content Embeddings'} subtitle={'Manage your content embeddings'} />
        <Layouts.Content>
          <EmptyState />
        </Layouts.Content>
        <ChatModal />
      </Main>
    );
  }

  // Render embeddings content based on loading state and data
  const renderEmbeddingsContent = () => {
    if (isLoading) {
      return (
        <Flex justifyContent="center" padding={8}>
          <Loader>Loading...</Loader>
        </Flex>
      );
    }

    if (embeddings?.data && embeddings.data.length > 0) {
      return <EmbeddingsTable data={embeddings.data} />;
    }

    return (
      <Box padding={8} textAlign="center">
        No embeddings found matching "{search}"
      </Box>
    );
  };

  // Check if pagination should be shown
  const shouldShowPagination = embeddings && embeddings.totalCount > 0 && totalPages > 1;

  // Get visible page numbers for pagination
  const getVisiblePages = (): number[] => {
    const pages: number[] = [];
    const maxVisible = 5;

    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  // Render pagination info and controls
  const renderPagination = () => {
    if (!shouldShowPagination || !embeddings) {
      return null;
    }

    const startItem = (currentPage - 1) * PAGE_SIZE + 1;
    const endItem = Math.min(currentPage * PAGE_SIZE, embeddings.totalCount);
    const visiblePages = getVisiblePages();

    return (
      <Flex direction="column" alignItems="center" gap={3} paddingTop={6}>
        <Pagination activePage={currentPage} pageCount={totalPages}>
          <PreviousLink
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </PreviousLink>
          {visiblePages.map((page) => (
            <PageLink
              key={page}
              number={page}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </PageLink>
          ))}
          <NextLink
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </NextLink>
        </Pagination>
        <Typography variant="pi" textColor="neutral600">
          Showing {startItem} to {endItem} of {embeddings.totalCount} entries
        </Typography>
      </Flex>
    );
  };

  return (
    <Main>
      <Layouts.Header
        title={'Content Embeddings'}
        subtitle={`${embeddings?.totalCount || 0} embeddings total`}
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
        {renderEmbeddingsContent()}
        {renderPagination()}
      </Layouts.Content>
      <ChatModal />
    </Main>
  );
}
