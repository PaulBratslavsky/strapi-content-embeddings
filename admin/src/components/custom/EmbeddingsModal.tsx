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
  SingleSelect,
  SingleSelectOption,
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

interface TextFieldOption {
  name: string;
  label: string;
  value: string;
  charCount: number;
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
  const [availableFields, setAvailableFields] = useState<TextFieldOption[]>([]);
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

  // Extract text value from a field (handles strings, blocks, and dynamic zones)
  const extractTextFromField = useCallback((value: any, depth: number = 0): string => {
    if (!value || depth > 5) return ""; // Prevent infinite recursion

    // Handle string values
    if (typeof value === "string") {
      return value.trim();
    }

    // Handle arrays (could be blocks, dynamic zones, or repeatable components)
    if (Array.isArray(value)) {
      const texts: string[] = [];

      for (const item of value) {
        // Check if it's a dynamic zone component (has __component property)
        if (item && typeof item === "object" && item.__component) {
          // Extract text from all fields in the component
          for (const [key, fieldValue] of Object.entries(item)) {
            if (key === "__component" || key === "id") continue;
            const extracted = extractTextFromField(fieldValue, depth + 1);
            if (extracted) texts.push(extracted);
          }
        }
        // Check if it's a blocks format item (rich text)
        else if (item && item.children) {
          const blockText = item.children
            .map((child: any) => child.text || "")
            .join("");
          if (blockText) texts.push(blockText);
        }
        // Recursively handle nested arrays/objects
        else if (item && typeof item === "object") {
          const extracted = extractTextFromField(item, depth + 1);
          if (extracted) texts.push(extracted);
        }
      }

      return texts.join("\n\n").trim();
    }

    // Handle objects (could be a component or relation)
    if (typeof value === "object") {
      const texts: string[] = [];

      for (const [key, fieldValue] of Object.entries(value)) {
        // Skip metadata fields
        if (["id", "__component", "documentId", "createdAt", "updatedAt"].includes(key)) continue;
        const extracted = extractTextFromField(fieldValue, depth + 1);
        if (extracted) texts.push(extracted);
      }

      return texts.join("\n\n").trim();
    }

    return "";
  }, []);

  // Check if a value is a dynamic zone
  const isDynamicZone = (value: any): boolean => {
    return Array.isArray(value) && value.length > 0 && value[0]?.__component;
  };

  // Detect all available text fields from form values
  const detectTextFields = useCallback((): TextFieldOption[] => {
    if (!modifiedValues) return [];

    const fields: TextFieldOption[] = [];

    // Check all fields in form values
    for (const [name, value] of Object.entries(modifiedValues)) {
      // Skip non-content fields
      if (["id", "documentId", "createdAt", "updatedAt", "publishedAt", "locale", "localizations"].includes(name)) {
        continue;
      }

      const textValue = extractTextFromField(value);
      if (textValue && textValue.length > 0) {
        // Create a readable label from field name
        let label = name
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (str) => str.toUpperCase())
          .trim();

        // Add indicator for dynamic zones
        if (isDynamicZone(value)) {
          const componentCount = (value as any[]).length;
          label += ` (${componentCount} component${componentCount > 1 ? "s" : ""})`;
        }

        fields.push({
          name,
          label,
          value: textValue,
          charCount: textValue.length,
        });
      }
    }

    // Sort by character count (longest first) to prioritize main content
    fields.sort((a, b) => b.charCount - a.charCount);

    return fields;
  }, [modifiedValues, extractTextFromField]);

  // Update available fields when form values change
  useEffect(() => {
    const fields = detectTextFields();
    setAvailableFields(fields);

    // Auto-select first field if none selected
    if (fields.length > 0 && !fieldName) {
      setFieldName(fields[0].name);
      setContent(fields[0].value);
    }
  }, [detectTextFields, fieldName]);

  // Handle field selection change
  const handleFieldChange = (selectedFieldName: string) => {
    setFieldName(selectedFieldName);
    const selectedField = availableFields.find(f => f.name === selectedFieldName);
    if (selectedField) {
      setContent(selectedField.value);
    }
  };

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
    // Refresh available fields and select first one
    const fields = detectTextFields();
    setAvailableFields(fields);
    if (fields.length > 0) {
      setFieldName(fields[0].name);
      setContent(fields[0].value);
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

              {availableFields.length > 0 && (
                <Box marginBottom={4}>
                  <Field.Root>
                    <Field.Label>Source Field</Field.Label>
                    <Field.Hint>Select which field to use for the embedding content</Field.Hint>
                  </Field.Root>
                  <SingleSelect
                    value={fieldName}
                    onChange={(value: string) => handleFieldChange(value)}
                    placeholder="Select a field"
                  >
                    {availableFields.map((field) => (
                      <SingleSelectOption key={field.name} value={field.name}>
                        {field.label} ({field.charCount.toLocaleString()} chars)
                      </SingleSelectOption>
                    ))}
                  </SingleSelect>
                </Box>
              )}

              <Box marginBottom={4}>
                <Flex justifyContent="space-between" alignItems="center">
                  <Field.Root>
                    <Field.Label>Content Preview</Field.Label>
                  </Field.Root>
                  <Typography variant="pi" textColor="neutral600">
                    {contentLength.toLocaleString()} characters
                    {willChunk && (
                      <Typography textColor="primary600"> (~{estimatedChunks} chunks)</Typography>
                    )}
                  </Typography>
                </Flex>
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
