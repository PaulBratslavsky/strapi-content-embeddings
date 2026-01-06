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

function Metadata({ data }: MetadataProps) {
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

function ConfirmDeleteEmbedding({ onConfirm, isLoading }: ConfirmDeleteProps) {
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
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editMetadata, setEditMetadata] = useState("");

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      try {
        const response = await get(`/${PLUGIN_ID}/embeddings/find/${id}`);
        const embeddingData = response.data as EmbeddingData;
        setData(embeddingData);
        // Initialize edit form
        setEditTitle(embeddingData.title || "");
        setEditContent(embeddingData.content || "");
        setEditMetadata(embeddingData.metadata ? JSON.stringify(embeddingData.metadata, null, 2) : "");
      } catch (error) {
        console.error("Failed to fetch embedding:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [id, get]);

  const handleDelete = async () => {
    if (!id || isDeleting) return;
    setIsDeleting(true);
    try {
      await del(`/${PLUGIN_ID}/embeddings/delete-embedding/${id}`);
      navigate(`/plugins/${PLUGIN_ID}`);
    } catch (error) {
      console.error("Failed to delete embedding:", error);
      setIsDeleting(false);
    }
  };

  const handleStartEdit = () => {
    if (data) {
      setEditTitle(data.title || "");
      setEditContent(data.content || "");
      setEditMetadata(data.metadata ? JSON.stringify(data.metadata, null, 2) : "");
    }
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!id || isSaving) return;

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
      const response = await put(`/${PLUGIN_ID}/embeddings/update-embedding/${id}`, {
        data: {
          title: editTitle.trim(),
          content: editContent.trim(),
          metadata: parsedMetadata,
        },
      });

      setData(response.data as EmbeddingData);
      setIsEditing(false);
      toggleNotification({
        type: "success",
        message: "Embedding updated successfully",
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

  if (!data) {
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

  return (
    <Main>
      <Layouts.Header
        title={isEditing ? "Edit Embedding" : (data.title || "Embedding Details")}
        subtitle={`Embedding ID: ${data.embeddingId || "N/A"}`}
        primaryAction={
          isEditing ? (
            <Flex gap={2}>
              <Button variant="tertiary" startIcon={<Cross />} onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button startIcon={<Check />} onClick={handleSave} loading={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </Flex>
          ) : (
            <Flex gap={2}>
              <Button variant="secondary" startIcon={<Pencil />} onClick={handleStartEdit}>
                Edit
              </Button>
              <ConfirmDeleteEmbedding onConfirm={handleDelete} isLoading={isDeleting} />
            </Flex>
          )
        }
        navigationAction={<BackLink to={`/plugins/${PLUGIN_ID}`} />}
      />
      <Layouts.Content>
        <Box padding={8}>
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
                    <StyledTypography variant="beta">
                      Embedding Content
                    </StyledTypography>
                    {data.content ? (
                      <Markdown>{data.content}</Markdown>
                    ) : (
                      <Typography textColor="neutral600">No content</Typography>
                    )}
                  </Box>
                </Box>
              </Grid.Item>
              <Grid.Item col={4} s={12}>
                <Box background="neutral100" padding={1} hasRadius>
                  <Metadata data={data} />
                </Box>
              </Grid.Item>
            </Grid.Root>
          )}
        </Box>
      </Layouts.Content>
    </Main>
  );
}
