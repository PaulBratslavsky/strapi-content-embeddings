import { useState } from 'react';
import { Box } from '@strapi/design-system';
import styled, { createGlobalStyle } from 'styled-components';
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

const MDXEditorStyles = createGlobalStyle`
  /* MDXEditor CSS Variables */
  :root {
    --mdx-spacing-0_5: 0.125rem;
    --mdx-spacing-1: 0.25rem;
    --mdx-spacing-1_5: 0.375rem;
    --mdx-spacing-2: 0.5rem;
    --mdx-spacing-3: 0.75rem;
    --mdx-spacing-4: 1rem;
    --mdx-spacing-36: 9rem;
    --mdx-radius-base: 0.25rem;
    --mdx-radius-medium: 0.375rem;
    --mdx-text-sm: 0.875rem;
    --mdx-baseBg: #f6f6f9;
    --mdx-baseBgActive: #e8e8ec;
    --mdx-basePageBg: #ffffff;
    --mdx-baseBorder: #dcdce4;
    --mdx-baseBorderHover: #b9bbc6;
    --mdx-baseBase: #e0e1e6;
    --mdx-baseTextContrast: #1c2024;
    --mdx-accentText: #4945ff;
  }

  /* Toolbar Root - critical for horizontal layout */
  [class*="_toolbarRoot"] {
    z-index: 2;
    display: flex !important;
    flex-direction: row !important;
    flex-wrap: wrap !important;
    gap: var(--mdx-spacing-1);
    border-radius: var(--mdx-radius-medium);
    padding: var(--mdx-spacing-1_5);
    align-items: center !important;
    overflow-x: auto;
    position: sticky;
    top: 0;
    background-color: var(--mdx-baseBg) !important;
    border-bottom: 1px solid var(--mdx-baseBorder);
    width: 100%;
  }

  [class*="_toolbarRoot"] div[role='separator'] {
    margin: var(--mdx-spacing-2) var(--mdx-spacing-1);
    border-left: 1px solid var(--mdx-baseBorder);
    border-right: 1px solid var(--mdx-baseBase);
    height: var(--mdx-spacing-4);
  }

  [class*="_toolbarRoot"] svg {
    color: var(--mdx-baseTextContrast);
    display: block;
  }

  /* Toolbar button groups */
  [class*="_toolbarGroupOfGroups"] {
    display: flex;
    margin: 0 var(--mdx-spacing-1);
  }

  [class*="_toolbarToggleSingleGroup"] {
    display: flex;
    align-items: center;
    white-space: nowrap;
  }

  /* Toolbar buttons and toggle items */
  [class*="_toolbarToggleItem"],
  [class*="_toolbarButton"] {
    border: 0;
    background-color: transparent;
    font-size: inherit;
    appearance: none;
    box-sizing: border-box;
    cursor: pointer;
    padding: var(--mdx-spacing-0_5);
    border-radius: var(--mdx-radius-base);
  }

  [class*="_toolbarToggleItem"]:hover,
  [class*="_toolbarButton"]:hover {
    background-color: var(--mdx-baseBgActive);
  }

  [class*="_toolbarToggleItem"][data-state='on'],
  [class*="_toolbarButton"][data-state='on'],
  [class*="_toolbarToggleItem"]:active,
  [class*="_toolbarButton"]:active {
    color: var(--mdx-baseTextContrast);
    background-color: var(--mdx-baseBgActive);
  }

  /* Block type select dropdown */
  [class*="_toolbarNodeKindSelectTrigger"],
  [class*="_selectTrigger"] {
    border: 0;
    display: flex;
    color: inherit;
    align-items: center;
    width: var(--mdx-spacing-36);
    padding: var(--mdx-spacing-0_5) var(--mdx-spacing-1);
    padding-inline-start: var(--mdx-spacing-2);
    border-radius: var(--mdx-radius-medium);
    white-space: nowrap;
    font-size: var(--mdx-text-sm);
    background-color: var(--mdx-basePageBg);
    margin: 0 var(--mdx-spacing-1);
    cursor: pointer;
  }

  /* Dropdown containers */
  [class*="_toolbarNodeKindSelectContainer"],
  [class*="_selectContainer"] {
    filter: drop-shadow(0 2px 2px rgb(0 0 0 / 0.2));
    z-index: 100;
    width: var(--mdx-spacing-36);
    border-radius: var(--mdx-radius-base);
    background-color: var(--mdx-basePageBg);
    font-size: var(--mdx-text-sm);
  }

  /* Select items */
  [class*="_toolbarNodeKindSelectItem"],
  [class*="_selectItem"] {
    cursor: pointer;
    display: flex;
    padding: var(--mdx-spacing-2);
  }

  [class*="_toolbarNodeKindSelectItem"][data-highlighted],
  [class*="_selectItem"][data-highlighted],
  [class*="_toolbarNodeKindSelectItem"][data-state='checked'],
  [class*="_selectItem"][data-state='checked'] {
    background-color: var(--mdx-baseBg);
    outline: none;
  }

  /* Dropdown arrow */
  [class*="_selectDropdownArrow"] {
    margin-left: auto;
    display: flex;
    align-items: center;
  }

  /* Content editable area */
  [class*="_contentEditable"] {
    box-sizing: border-box;
    width: 100%;
    color: var(--mdx-baseTextContrast);
    padding: var(--mdx-spacing-3);
    min-height: 200px;
    outline: none;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.6;
  }

  [class*="_contentEditable"]:focus {
    outline: none;
  }

  /* Heading styles */
  [class*="_contentEditable"] h1 {
    font-size: 1.75rem;
    font-weight: 600;
    margin: 0 0 1rem;
  }

  [class*="_contentEditable"] h2 {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 1rem 0 0.75rem;
  }

  [class*="_contentEditable"] h3 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 1rem 0 0.5rem;
  }

  /* Paragraph and list styles */
  [class*="_contentEditable"] p {
    margin: 0 0 1rem;
  }

  [class*="_contentEditable"] ul,
  [class*="_contentEditable"] ol {
    margin: 0 0 1rem;
    padding-left: 1.5rem;
  }

  [class*="_contentEditable"] li {
    margin: 0.25rem 0;
  }

  /* Code styles */
  [class*="_contentEditable"] code {
    background: #f0f0f5;
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-family: "Monaco", "Menlo", monospace;
    font-size: 0.9em;
  }

  [class*="_contentEditable"] pre {
    background: #2d2d2d;
    color: #f8f8f2;
    padding: 1rem;
    border-radius: 4px;
    overflow-x: auto;
    margin: 0 0 1rem;
  }

  [class*="_contentEditable"] pre code {
    background: none;
    padding: 0;
  }

  /* Blockquote */
  [class*="_contentEditable"] blockquote {
    border-left: 3px solid #dcdce4;
    margin: 0 0 1rem;
    padding-left: 1rem;
    color: #666;
  }

  /* Links */
  [class*="_contentEditable"] a {
    color: #4945ff;
    text-decoration: underline;
  }

  /* Horizontal rule */
  [class*="_contentEditable"] hr {
    border: none;
    border-top: 1px solid #dcdce4;
    margin: 1.5rem 0;
  }

  /* Editor root */
  [class*="_editorRoot"] {
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: var(--mdx-baseTextContrast);
    background: var(--mdx-basePageBg);
  }

  /* Link dialog */
  [class*="_linkDialogPopoverContent"] {
    display: flex;
    flex-direction: column;
    gap: var(--mdx-spacing-2);
    padding: var(--mdx-spacing-3);
    background-color: var(--mdx-basePageBg);
    border-radius: var(--mdx-radius-medium);
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    z-index: 100;
  }

  [class*="_linkDialogInputWrapper"] {
    display: flex;
    gap: var(--mdx-spacing-1);
  }

  [class*="_linkDialogInputWrapper"] input {
    flex: 1;
    padding: var(--mdx-spacing-1) var(--mdx-spacing-2);
    border: 1px solid var(--mdx-baseBorder);
    border-radius: var(--mdx-radius-base);
    font-size: var(--mdx-text-sm);
  }

  [class*="_linkDialogInputWrapper"] button {
    padding: var(--mdx-spacing-1) var(--mdx-spacing-2);
    background-color: var(--mdx-accentText);
    color: white;
    border: none;
    border-radius: var(--mdx-radius-base);
    cursor: pointer;
  }

  /* Popover positioning */
  [data-radix-popper-content-wrapper] {
    z-index: 100 !important;
  }
`;

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
    <>
      <MDXEditorStyles />
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
    </>
  );
}
