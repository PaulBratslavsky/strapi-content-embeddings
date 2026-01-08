import React from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Td,
  Th,
  Typography,
  VisuallyHidden,
  Flex,
  IconButton,
} from "@strapi/design-system";
import { ArrowRight } from "@strapi/icons";
import { PLUGIN_ID } from "../../pluginId";

const StyledTr = styled(Tr)`
  cursor: pointer;
  &:hover {
    background-color: #f0f0ff;
  }
`;

interface Embedding {
  id: number;
  documentId: string;
  title: string;
  content?: string;
  embeddingId?: string;
}

interface EmbeddingsTableProps {
  data: Embedding[];
}

export function EmbeddingsTable({ data }: Readonly<EmbeddingsTableProps>) {
  const navigate = useNavigate();

  const handleRowClick = (documentId: string) => {
    navigate(`/plugins/${PLUGIN_ID}/embeddings/${documentId}`);
  };

  return (
    <Box padding={0} background="neutral100">
      <Table colCount={5} rowCount={data.length + 1}>
        <Thead>
          <Tr>
            <Th>
              <Typography variant="sigma">ID</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">Title</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">Content</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">Embed ID</Typography>
            </Th>
            <Th>
              <VisuallyHidden>Actions</VisuallyHidden>
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {data?.map((entry) => (
            <StyledTr
              key={entry.documentId}
              onClick={() => handleRowClick(entry.documentId)}
            >
              <Td>
                <Typography textColor="neutral800">
                  {entry.documentId.slice(0, 8)}...
                </Typography>
              </Td>
              <Td>
                <Typography textColor="neutral800">
                  {entry.title?.slice(0, 30)}
                  {entry.title?.length > 30 ? "..." : ""}
                </Typography>
              </Td>
              <Td>
                <Typography textColor="neutral800">
                  {entry.content?.slice(0, 30)}
                  {entry.content && entry.content.length > 30 ? "..." : ""}
                </Typography>
              </Td>
              <Td>
                <Typography textColor="neutral800">
                  {entry.embeddingId?.slice(0, 8)}
                  {entry.embeddingId && entry.embeddingId.length > 8
                    ? "..."
                    : ""}
                </Typography>
              </Td>
              <Td>
                <Flex>
                  <IconButton
                    withTooltip={false}
                    label="View details"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handleRowClick(entry.documentId);
                    }}
                  >
                    <ArrowRight />
                  </IconButton>
                </Flex>
              </Td>
            </StyledTr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}
