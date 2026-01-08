import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import qs from "qs";
import {
  unstable_useContentManagerContext as useContentManagerContext,
  useFetchClient,
  useNotification,
} from "@strapi/strapi/admin";
import {
  Button,
  Typography,
  Box,
  Modal,
  Field,
  TextInput,
  Loader,
  Flex,
} from "@strapi/design-system";
import { Plus, Eye } from "@strapi/icons";
import { PLUGIN_ID } from "../../pluginId";
import { MarkdownEditor } from "./MarkdownEditor";

const StyledTypography = styled(Typography)`
  display: block;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
`;

const CHUNK_SIZE = 4000; // Content over this will be auto-chunked

interface ExistingEmbedding {
  documentId: string;
  title: string;
  content?: string;
}

export function EmbeddingsModal() {
  const { post, get } = useFetchClient();
  const { toggleNotification } = useNotification();
  const navigate = useNavigate();

  // Access content manager context
  const context = useContentManagerContext();
  const { form, id, slug, collectionType } = context;

  const modifiedValues = form?.values || {};

  const [isVisible, setIsVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [fieldName, setFieldName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingExisting, setIsCheckingExisting] = useState(true);
  const [existingEmbedding, setExistingEmbedding] = useState<ExistingEmbedding | null>(null);

  // Check for existing embedding when component mounts or id changes
  useEffect(() => {
    async function checkExistingEmbedding() {
      if (!id || !slug) {
        setIsCheckingExisting(false);
        return;
      }

      try {
        // Query embeddings filtered by metadata containing this documentId
        const query = qs.stringify({
          filters: {
            metadata: { $containsi: id },
          },
        });

        const response = await get(`/${PLUGIN_ID}/embeddings/find?${query}`);

        // Handle response - could be { data: [...] } or { data: { data: [...] } }
        const embeddings = response.data?.data || response.data || [];

        if (Array.isArray(embeddings) && embeddings.length > 0) {
          // Found existing embedding for this content
          setExistingEmbedding({
            documentId: embeddings[0].documentId,
            title: embeddings[0].title,
            content: embeddings[0].content,
          });
        }
      } catch (error) {
        console.error("Failed to check for existing embedding:", error);
      } finally {
        setIsCheckingExisting(false);
      }
    }

    checkExistingEmbedding();
  }, [id, slug, get]);

  // Extract text content from form values
  const extractContentFromForm = useCallback(() => {
    if (!modifiedValues) return "";

    // Look for common text field names
    const textFieldNames = ["content", "description", "body", "text", "richtext", "markdown"];

    for (const name of textFieldNames) {
      const value = modifiedValues[name];
      if (value) {
        // Handle different content formats
        if (typeof value === "string" && value.trim()) {
          setFieldName(name);
          return value;
        } else if (Array.isArray(value)) {
          // Blocks format - extract text
          const text = value
            .map((block: any) => {
              if (block.children) {
                return block.children.map((child: any) => child.text || "").join("");
              }
              return "";
            })
            .join("\n\n");
          if (text.trim()) {
            setFieldName(name);
            return text;
          }
        }
      }
    }
    return "";
  }, [modifiedValues]);

  // Find text content from form values
  useEffect(() => {
    const formContent = extractContentFromForm();
    if (formContent) {
      setContent(formContent);
    }
  }, [extractContentFromForm]);

  const contentLength = content.length;
  const willChunk = contentLength > CHUNK_SIZE;
  const estimatedChunks = willChunk ? Math.ceil(contentLength / (CHUNK_SIZE - 200)) : 1;
  // Check if content is saved (has an id) - don't require publish
  const isSaved = !!id;

  // Auto-generate metadata from collection context
  function generateMetadata(): Record<string, any> {
    return {
      source: "content-manager",
      collectionType: slug || collectionType || "unknown",
      fieldName: fieldName || "content",
      documentId: id,
      updatedAt: new Date().toISOString(),
    };
  }

  const isValid = title.trim() && content.trim(); // No length limit - auto-chunks if needed

  function handleOpenCreate() {
    setTitle("");
    // Refresh content from current form values
    const formContent = extractContentFromForm();
    if (formContent) {
      setContent(formContent);
    }
    setIsVisible(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      toggleNotification({
        type: "warning",
        message: "Embeddings title is required",
      });
      return;
    }

    if (!content.trim()) {
      toggleNotification({
        type: "warning",
        message: "Embeddings content is required",
      });
      return;
    }

    setIsLoading(true);

    try {
      const contentToEmbed = content.trim();
      const shouldChunk = contentToEmbed.length > CHUNK_SIZE;
      const chunks = shouldChunk ? Math.ceil(contentToEmbed.length / CHUNK_SIZE) : 1;

      if (shouldChunk) {
        console.log(`Creating chunked embedding: ${contentToEmbed.length} chars (~${chunks} parts)`);
      }

      const result = await post(`/${PLUGIN_ID}/embeddings/create-embedding`, {
        data: {
          title: title.trim(),
          content: contentToEmbed,
          collectionType: slug || collectionType,
          fieldName,
          metadata: generateMetadata(),
          autoChunk: shouldChunk,
        },
      });

      const responseData = result?.data || result;

      if (responseData?.documentId) {
        setExistingEmbedding({
          documentId: responseData.documentId,
          title: responseData.title,
          content: responseData.content,
        });
      }
      setIsVisible(false);

      const message = shouldChunk
        ? `Embedding created and chunked into ${chunks} parts`
        : "Embedding created successfully";
      toggleNotification({ type: "success", message });
    } catch (error: any) {
      console.error("Failed to create embedding:", error);
      toggleNotification({
        type: "danger",
        message: error.message || "Failed to create embedding",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleViewEmbedding() {
    if (existingEmbedding?.documentId) {
      navigate(`/plugins/${PLUGIN_ID}/embeddings/${existingEmbedding.documentId}`);
    }
  }

  // Don't render if not in edit view context
  if (!form || !id) {
    return null;
  }

  // Show loading state while checking for existing embedding
  if (isCheckingExisting) {
    return (
      <Box paddingTop={2}>
        <Loader small>Checking embeddings...</Loader>
      </Box>
    );
  }

  const submitButtonText = isLoading ? "Creating..." : "Create Embedding";

  return (
    <Box paddingTop={2}>
      {existingEmbedding ? (
        <Button onClick={handleViewEmbedding} startIcon={<Eye />} fullWidth>
          View Embedding
        </Button>
      ) : (
        <Button
          onClick={handleOpenCreate}
          startIcon={<Plus />}
          disabled={!isSaved}
          fullWidth
        >
          Create Embedding
        </Button>
      )}

      {!isSaved && !existingEmbedding && (
        <Typography variant="pi" textColor="neutral600" style={{ display: "block", marginTop: "0.5rem" }}>
          Save content first to create embedding
        </Typography>
      )}

      <Modal.Root open={isVisible} onOpenChange={setIsVisible}>
        <Modal.Content>
          <Modal.Header>
            <Modal.Title>Create Embedding from Content</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Box>
              <StyledTypography variant="omega" textColor="neutral600">
                Content: {contentLength} characters
                {willChunk && (
                  <Typography textColor="primary600"> (will create ~{estimatedChunks} embeddings)</Typography>
                )}
              </StyledTypography>

              <Box marginBottom={4}>
                <Field.Root>
                  <Field.Label>Title</Field.Label>
                  <TextInput
                    placeholder="Enter embedding title"
                    value={title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setTitle(e.target.value)
                    }
                  />
                </Field.Root>
              </Box>

              <Box marginBottom={4}>
                <Field.Root>
                  <Field.Label>Content</Field.Label>
                  <Field.Hint>
                    {fieldName ? `From field: ${fieldName}` : "Enter content manually"}
                  </Field.Hint>
                </Field.Root>
                <MarkdownEditor
                  content={content}
                  onChange={setContent}
                  height={200}
                />
              </Box>
            </Box>
          </Modal.Body>
          <Modal.Footer>
            <Modal.Close>
              <Button variant="tertiary">Cancel</Button>
            </Modal.Close>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !isValid}
              loading={isLoading}
            >
              {submitButtonText}
            </Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </Box>
  );
}
