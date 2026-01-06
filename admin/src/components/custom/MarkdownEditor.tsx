import '@mdxeditor/editor/style.css';
import './markdown-editor.css';

import { useState } from 'react';
import { Box } from '@strapi/design-system';
import styled from 'styled-components';
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  linkDialogPlugin,
  toolbarPlugin,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  CreateLink,
  ListsToggle,
  UndoRedo,
  Separator,
} from '@mdxeditor/editor';

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  height?: number;
}

const EditorWrapper = styled(Box)<{ $isFocused: boolean }>`
  border: 1px solid ${({ $isFocused }) => ($isFocused ? '#4945ff' : '#dcdce4')};
  border-radius: 4px;
  overflow: hidden;
  background: #fff;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-shadow: ${({ $isFocused }) => ($isFocused ? '0 0 0 2px rgba(73, 69, 255, 0.2)' : 'none')};
`;

export function MarkdownEditor({ content, onChange, height = 300 }: MarkdownEditorProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <EditorWrapper
      $isFocused={isFocused}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    >
      <div style={{ minHeight: `${height}px` }}>
        <MDXEditor
          markdown={content}
          onChange={onChange}
          placeholder="Write your content here..."
          contentEditableClassName="mdx-editor-content"
          plugins={[
            headingsPlugin(),
            listsPlugin(),
            quotePlugin(),
            thematicBreakPlugin(),
            linkPlugin(),
            linkDialogPlugin(),
            markdownShortcutPlugin(),
            toolbarPlugin({
              toolbarContents: () => (
                <>
                  <UndoRedo />
                  <Separator />
                  <BlockTypeSelect />
                  <Separator />
                  <BoldItalicUnderlineToggles />
                  <Separator />
                  <CreateLink />
                  <Separator />
                  <ListsToggle />
                </>
              ),
            }),
          ]}
        />
      </div>
    </EditorWrapper>
  );
}
