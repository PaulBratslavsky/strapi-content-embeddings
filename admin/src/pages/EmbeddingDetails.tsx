import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";
import {
  Main,
  Box,
  Flex,
  Button,
  Typography,
  Grid,
  Dialog,
  Loader,
  Field,
  TextInput,
  Textarea,
  Badge,
} from "@strapi/design-system";
import { Trash, Pencil, Check, Cross } from "@strapi/icons";
import { useFetchClient, Layouts, useNotification } from "@strapi/strapi/admin";

import { PLUGIN_ID } from "../pluginId";
import { BackLink } from "../components/custom/BackLink";
import { Markdown } from "../components/custom/Markdown";
import { MarkdownEditor } from "../components/custom/MarkdownEditor";

const StyledTypography = styled(Typography)`
  display: block;
  margin-bottom: 1rem;
`;

const ChunkTab = styled.div<{ $isActive: boolean }>`
  padding: 0.5rem 1rem;
  cursor: pointer;
  border-bottom: 2px solid ${({ $isActive }) => ($isActive ? '#4945ff' : 'transparent')};
  color: ${({ $isActive }) => ($isActive ? '#4945ff' : 'inherit')};
  font-weight: ${({ $isActive }) => ($isActive ? '600' : '400')};
  white-space: nowrap;

  &:hover {
    color: #4945ff;
  }
`;

const ChunkTabsContainer = styled(Flex)`
  border-bottom: 1px solid #dcdce4;
  overflow-x: auto;
  margin-bottom: 1rem;
`;

interface EmbeddingData {
  id: number;
  documentId: string;
  title: string;
  content?: string;
  embeddingId?: string;
  embedding?: number[];
  collectionType?: string;
  fieldName?: string;
  metadata?: Record<string, any>;
}

interface MetadataProps {
  data: EmbeddingData;
}

function Metadata({ data }: Readonly<MetadataProps>) {
  const metadata = {
    id: data.documentId,
    title: data.title,
    collectionType: data.collectionType || "standalone",
    fieldName: data.fieldName || "content",
    embeddingId: data.embeddingId || "N/A",
    vectorDimensions: data.embedding?.length || 0,
  };

  return (
    <Box padding={4} background="neutral0" hasRadius>
      <StyledTypography variant="beta">Metadata</StyledTypography>
      {Object.entries(metadata).map(([key, value]) => (
        <Box key={key} padding={1}>
          <Typography>
            <strong>{key}:</strong> {String(value)}
          </Typography>
        </Box>
      ))}
      {data.metadata && (
        <Box marginTop={4}>
          <Typography variant="sigma">Custom Metadata</Typography>
          <Box padding={2} background="neutral100" hasRadius marginTop={2}>
            <pre style={{ fontSize: "12px", margin: 0, whiteSpace: "pre-wrap" }}>
              {JSON.stringify(data.metadata, null, 2)}
            </pre>
          </Box>
        </Box>
      )}
    </Box>
  );
}

interface ConfirmDeleteProps {
  onConfirm: () => void;
  isLoading: boolean;
}

function ConfirmDeleteEmbedding({ onConfirm, isLoading }: Readonly<ConfirmDeleteProps>) {
  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <Button variant="danger-light" startIcon={<Trash />}>
          Delete
        </Button>
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Header>Confirm Deletion</Dialog.Header>
        <Dialog.Body>
          <Flex direction="column" alignItems="center" gap={2}>
            <Typography>Are you sure you want to delete this embedding?</Typography>
            <Typography variant="pi" textColor="neutral600">
              This action cannot be undone.
            </Typography>
          </Flex>
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.Cancel>
            <Button variant="tertiary">Cancel</Button>
          </Dialog.Cancel>
          <Dialog.Action>
            <Button
              variant="danger"
              onClick={onConfirm}
              startIcon={<Trash />}
              loading={isLoading}
            >
              {isLoading ? "Deleting..." : "Delete"}
            </Button>
          </Dialog.Action>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}

export default function EmbeddingDetails() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { del, get, put } = useFetchClient();
  const { toggleNotification } = useNotification();

  const [data, setData] = useState<EmbeddingData | null>(null);
  const [chunks, setChunks] = useState<EmbeddingData[]>([]);
  const [activeChunkIndex, setActiveChunkIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editMetadata, setEditMetadata] = useState("");

  // Check if this is a chunked document
  const isChunkedDocument = chunks.length > 1;
  const activeChunk = isChunkedDocument ? chunks[activeChunkIndex] : data;

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      try {
        // First fetch the main embedding
        const response = await get(`/${PLUGIN_ID}/embeddings/find/${id}`);
        const embeddingData = response.data as EmbeddingData;
        setData(embeddingData);

        // Check if this is part of a chunked document and fetch related chunks
        const chunksResponse = await get(`/${PLUGIN_ID}/embeddings/related-chunks/${id}`);
        const relatedChunks = chunksResponse.data?.data || [];

        if (relatedChunks.length > 1) {
          // Sort chunks by chunkIndex
          const sortedChunks = relatedChunks.sort((a: EmbeddingData, b: EmbeddingData) => {
            const aIndex = (a.metadata as any)?.chunkIndex ?? 0;
            const bIndex = (b.metadata as any)?.chunkIndex ?? 0;
            return aIndex - bIndex;
          });
          setChunks(sortedChunks);

          // Find the index of the current chunk
          const currentIndex = sortedChunks.findIndex(
            (chunk: EmbeddingData) => chunk.documentId === id
          );
          if (currentIndex >= 0) {
            setActiveChunkIndex(currentIndex);
          }

          // Initialize edit form with first chunk
          const firstChunk = sortedChunks[currentIndex >= 0 ? currentIndex : 0];
          setEditTitle(firstChunk.title || "");
          setEditContent(firstChunk.content || "");
          setEditMetadata(firstChunk.metadata ? JSON.stringify(firstChunk.metadata, null, 2) : "");
        } else {
          setChunks([embeddingData]);
          // Initialize edit form
          setEditTitle(embeddingData.title || "");
          setEditContent(embeddingData.content || "");
          setEditMetadata(embeddingData.metadata ? JSON.stringify(embeddingData.metadata, null, 2) : "");
        }
      } catch (error) {
        console.error("Failed to fetch embedding:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [id, get]);

  // Update edit form when active chunk changes
  useEffect(() => {
    if (activeChunk && !isEditing) {
      setEditTitle(activeChunk.title || "");
      setEditContent(activeChunk.content || "");
      setEditMetadata(activeChunk.metadata ? JSON.stringify(activeChunk.metadata, null, 2) : "");
    }
  }, [activeChunkIndex, activeChunk, isEditing]);

  const handleDelete = async () => {
    if (!activeChunk || isDeleting) return;
    setIsDeleting(true);
    try {
      // If chunked document, delete all chunks
      if (isChunkedDocument) {
        for (const chunk of chunks) {
          await del(`/${PLUGIN_ID}/embeddings/delete-embedding/${chunk.documentId}`);
        }
      } else {
        await del(`/${PLUGIN_ID}/embeddings/delete-embedding/${activeChunk.documentId}`);
      }
      navigate(`/plugins/${PLUGIN_ID}`);
    } catch (error) {
      console.error("Failed to delete embedding:", error);
      setIsDeleting(false);
    }
  };

  const handleStartEdit = () => {
    if (activeChunk) {
      setEditTitle(activeChunk.title || "");
      setEditContent(activeChunk.content || "");
      setEditMetadata(activeChunk.metadata ? JSON.stringify(activeChunk.metadata, null, 2) : "");
    }
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset to current chunk values
    if (activeChunk) {
      setEditTitle(activeChunk.title || "");
      setEditContent(activeChunk.content || "");
      setEditMetadata(activeChunk.metadata ? JSON.stringify(activeChunk.metadata, null, 2) : "");
    }
  };

  const handleSave = async () => {
    if (!activeChunk || isSaving) return;

    // Validate metadata JSON if provided
    let parsedMetadata = null;
    if (editMetadata.trim()) {
      try {
        parsedMetadata = JSON.parse(editMetadata);
      } catch {
        toggleNotification({
          type: "warning",
          message: "Invalid JSON in metadata field",
        });
        return;
      }
    }

    setIsSaving(true);
    try {
      const response = await put(`/${PLUGIN_ID}/embeddings/update-embedding/${activeChunk.documentId}`, {
        data: {
          title: editTitle.trim(),
          content: editContent.trim(),
          metadata: parsedMetadata,
        },
      });

      const updatedData = response.data as EmbeddingData;

      // Update the chunk in the chunks array
      if (isChunkedDocument) {
        const newChunks = [...chunks];
        newChunks[activeChunkIndex] = updatedData;
        setChunks(newChunks);
      } else {
        setData(updatedData);
        setChunks([updatedData]);
      }

      setIsEditing(false);
      toggleNotification({
        type: "success",
        message: "Chunk updated successfully",
      });
    } catch (error: any) {
      console.error("Failed to update embedding:", error);
      toggleNotification({
        type: "danger",
        message: error.message || "Failed to update embedding",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChunkSelect = (index: number) => {
    if (isEditing) {
      // Warn user about unsaved changes
      const confirmed = globalThis.confirm("You have unsaved changes. Discard them?");
      if (!confirmed) return;
      setIsEditing(false);
    }
    setActiveChunkIndex(index);
  };

  const getOriginalTitle = () => {
    if (isChunkedDocument && chunks[0]?.metadata) {
      return (chunks[0].metadata as any).originalTitle || chunks[0].title?.replace(/\s*\[Part \d+\/\d+\]$/, '');
    }
    return data?.title || "Embedding Details";
  };

  if (isLoading) {
    return (
      <Main>
        <Layouts.Header
          title="Loading..."
          navigationAction={<BackLink to={`/plugins/${PLUGIN_ID}`} />}
        />
        <Layouts.Content>
          <Flex justifyContent="center" padding={8}>
            <Loader>Loading embedding details...</Loader>
          </Flex>
        </Layouts.Content>
      </Main>
    );
  }

  if (!data || !activeChunk) {
    return (
      <Main>
        <Layouts.Header
          title="Embedding Not Found"
          navigationAction={<BackLink to={`/plugins/${PLUGIN_ID}`} />}
        />
        <Layouts.Content>
          <Box padding={8} textAlign="center">
            <Typography>The requested embedding could not be found.</Typography>
          </Box>
        </Layouts.Content>
      </Main>
    );
  }

  const headerTitle = isEditing
    ? `Edit: ${activeChunk.title}`
    : isChunkedDocument
      ? getOriginalTitle()
      : (data.title || "Embedding Details");

  const headerSubtitle = isChunkedDocument
    ? `Chunked Document (${chunks.length} parts)`
    : `Embedding ID: ${data.embeddingId || "N/A"}`;

  return (
    <Main>
      <Layouts.Header
        title={headerTitle}
        subtitle={headerSubtitle}
        primaryAction={
          isEditing ? (
            <Flex gap={2}>
              <Button variant="tertiary" startIcon={<Cross />} onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button startIcon={<Check />} onClick={handleSave} loading={isSaving}>
                {isSaving ? "Saving..." : "Save Chunk"}
              </Button>
            </Flex>
          ) : (
            <Flex gap={2}>
              <Button variant="secondary" startIcon={<Pencil />} onClick={handleStartEdit}>
                Edit {isChunkedDocument ? "Chunk" : ""}
              </Button>
              <ConfirmDeleteEmbedding onConfirm={handleDelete} isLoading={isDeleting} />
            </Flex>
          )
        }
        navigationAction={<BackLink to={`/plugins/${PLUGIN_ID}`} />}
      />
      <Layouts.Content>
        <Box padding={8}>
          {/* Chunk tabs for chunked documents */}
          {isChunkedDocument && (
            <Box marginBottom={4}>
              <Box background="neutral0" padding={4} hasRadius>
                <Flex justifyContent="space-between" alignItems="center" marginBottom={3}>
                  <Typography variant="beta">Document Chunks</Typography>
                  <Badge>{chunks.length} parts</Badge>
                </Flex>
                <ChunkTabsContainer gap={0}>
                  {chunks.map((chunk, index) => (
                    <ChunkTab
                      key={chunk.documentId}
                      $isActive={index === activeChunkIndex}
                      onClick={() => handleChunkSelect(index)}
                    >
                      Part {index + 1}
                      {index === activeChunkIndex && isEditing && " (editing)"}
                    </ChunkTab>
                  ))}
                </ChunkTabsContainer>
              </Box>
            </Box>
          )}

          {isEditing ? (
            <Grid.Root gap={6}>
              <Grid.Item col={8} s={12}>
                <Box background="neutral100" padding={1} hasRadius>
                  <Box padding={4} background="neutral0" hasRadius>
                    <Box marginBottom={4}>
                      <Field.Root>
                        <Field.Label>Title</Field.Label>
                        <TextInput
                          value={editTitle}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setEditTitle(e.target.value)
                          }
                        />
                      </Field.Root>
                    </Box>
                    <Box marginBottom={4}>
                      <Field.Root>
                        <Field.Label>Content</Field.Label>
                        <Field.Hint>
                          Changes to content will regenerate the embedding vector
                        </Field.Hint>
                      </Field.Root>
                      <MarkdownEditor
                        content={editContent}
                        onChange={setEditContent}
                        height={300}
                      />
                    </Box>
                  </Box>
                </Box>
              </Grid.Item>
              <Grid.Item col={4} s={12}>
                <Box background="neutral100" padding={1} hasRadius>
                  <Box padding={4} background="neutral0" hasRadius>
                    <Box marginBottom={4}>
                      <Field.Root>
                        <Field.Label>Metadata (JSON)</Field.Label>
                        <Field.Hint>Optional custom metadata</Field.Hint>
                        <Textarea
                          value={editMetadata}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            setEditMetadata(e.target.value)
                          }
                          placeholder='{"key": "value"}'
                        />
                      </Field.Root>
                    </Box>
                  </Box>
                </Box>
              </Grid.Item>
            </Grid.Root>
          ) : (
            <Grid.Root gap={6}>
              <Grid.Item col={8} s={12}>
                <Box background="neutral100" padding={1} hasRadius>
                  <Box padding={4} background="neutral0" hasRadius>
                    <Flex justifyContent="space-between" alignItems="center" marginBottom={3}>
                      <StyledTypography variant="beta" style={{ margin: 0 }}>
                        {isChunkedDocument ? `Part ${activeChunkIndex + 1} Content` : "Embedding Content"}
                      </StyledTypography>
                      {isChunkedDocument && (
                        <Typography variant="pi" textColor="neutral600">
                          {activeChunk.content?.length || 0} characters
                        </Typography>
                      )}
                    </Flex>
                    {activeChunk.content ? (
                      <Markdown>{activeChunk.content}</Markdown>
                    ) : (
                      <Typography textColor="neutral600">No content</Typography>
                    )}
                  </Box>
                </Box>
              </Grid.Item>
              <Grid.Item col={4} s={12}>
                <Box background="neutral100" padding={1} hasRadius>
                  <Metadata data={activeChunk} />
                </Box>
              </Grid.Item>
            </Grid.Root>
          )}
        </Box>
      </Layouts.Content>
    </Main>
  );
}
