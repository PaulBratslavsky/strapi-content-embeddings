import React from 'react';
import { Box, Field, TextInput, Textarea } from '@strapi/design-system';
import { MarkdownEditor } from '../custom/MarkdownEditor';

interface CreateEmbeddingsFormProps {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  input: string;
  setInput: (input: string) => void;
  markdown: string;
  handleMarkdownChange: React.Dispatch<React.SetStateAction<string>>;
  metadata: string;
  setMetadata: (metadata: string) => void;
  height?: number;
  children?: React.ReactNode;
}

export function CreateEmbeddingsForm({
  onSubmit,
  isLoading,
  input,
  setInput,
  markdown,
  handleMarkdownChange,
  metadata,
  setMetadata,
  height,
  children,
}: CreateEmbeddingsFormProps) {
  return (
    <form onSubmit={onSubmit}>
      <fieldset disabled={isLoading} style={{ border: 'none', padding: 0, margin: 0 }}>
        <Box marginBottom={4}>
          <Field.Root>
            <Field.Label>Title</Field.Label>
            <TextInput
              placeholder="Enter a title for your embedding"
              name="input"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
              value={input}
            />
          </Field.Root>
        </Box>

        <Box marginBottom={4}>
          <Field.Root>
            <Field.Label>Content</Field.Label>
            <MarkdownEditor
              content={markdown}
              onChange={handleMarkdownChange}
              height={height}
            />
          </Field.Root>
        </Box>

        <Box marginBottom={4}>
          <Field.Root>
            <Field.Label>Metadata (JSON)</Field.Label>
            <Field.Hint>Optional JSON metadata for this embedding</Field.Hint>
            <Textarea
              placeholder='{"category": "docs", "source": "manual"}'
              name="metadata"
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMetadata(e.target.value)}
              value={metadata}
            />
          </Field.Root>
        </Box>

        {children}
      </fieldset>
    </form>
  );
}
