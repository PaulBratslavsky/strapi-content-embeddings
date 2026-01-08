import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIntl } from "react-intl";
import { Main, Box, Button } from "@strapi/design-system";
import { useFetchClient, Layouts } from "@strapi/strapi/admin";

import { PLUGIN_ID } from "../pluginId";
import { CreateEmbeddingsForm } from "../components/forms/CreateEmbeddingForm";
import { BackLink } from "../components/custom/BackLink";

const CHUNK_SIZE = 4000; // Content over this will be auto-chunked

export default function CreateEmbeddings() {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const { post } = useFetchClient();

  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [metadata, setMetadata] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isValid = title.trim() && content.trim();
  const contentLength = content.length;
  const willChunk = contentLength > CHUNK_SIZE;
  const estimatedChunks = willChunk ? Math.ceil(contentLength / (CHUNK_SIZE - 200)) : 1;

  function parseMetadata(): Record<string, any> | null {
    if (!metadata.trim()) return null;
    try {
      return JSON.parse(metadata);
    } catch {
      return null;
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();

    if (!isValid) {
      setError("Please provide a title and content");
      return;
    }

    // Validate metadata JSON if provided
    if (metadata.trim()) {
      const parsedMetadata = parseMetadata();
      if (parsedMetadata === null) {
        setError("Invalid JSON in metadata field");
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      await post(`/${PLUGIN_ID}/embeddings/create-embedding`, {
        data: {
          title: title.trim(),
          content: content.trim(),
          metadata: parseMetadata(),
        },
      });
      navigate(`/plugins/${PLUGIN_ID}`);
    } catch (err: any) {
      console.error("Failed to create embedding:", err);
      setError(err.message || "Failed to create embedding. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <Main>
      <Layouts.Header
        title={formatMessage({
          id: "CreateEmbeddings.header.title",
          defaultMessage: "Create Embedding",
        })}
        subtitle={
          willChunk
            ? formatMessage(
                {
                  id: "CreateEmbeddings.header.subtitle.chunked",
                  defaultMessage: "Content: {length} characters (will create ~{chunks} embeddings)",
                },
                { length: contentLength, chunks: estimatedChunks }
              )
            : formatMessage(
                {
                  id: "CreateEmbeddings.header.subtitle",
                  defaultMessage: "Content: {length} characters",
                },
                { length: contentLength }
              )
        }
        primaryAction={
          <Button
            type="submit"
            disabled={isLoading || !isValid}
            loading={isLoading}
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              const form = document.querySelector("form");
              if (form) {
                form.dispatchEvent(
                  new Event("submit", { cancelable: true, bubbles: true })
                );
              }
            }}
          >
            {isLoading ? "Creating..." : "Create Embedding"}
          </Button>
        }
        navigationAction={<BackLink to={`/plugins/${PLUGIN_ID}`} />}
      />
      <Layouts.Content>
        <Box>
          {error && (
            <Box
              padding={4}
              marginBottom={4}
              background="danger100"
              borderColor="danger600"
              hasRadius
            >
              {error}
            </Box>
          )}
          <CreateEmbeddingsForm
            onSubmit={handleSubmit}
            isLoading={isLoading}
            input={title}
            setInput={setTitle}
            markdown={content}
            handleMarkdownChange={setContent}
            metadata={metadata}
            setMetadata={setMetadata}
          />
        </Box>
      </Layouts.Content>
    </Main>
  );
}
