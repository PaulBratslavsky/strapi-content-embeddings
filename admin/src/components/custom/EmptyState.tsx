import { EmptyStateLayout, Button } from '@strapi/design-system';
import { Link } from 'react-router-dom';
import { PLUGIN_ID } from "../../pluginId"
import { Plus } from '@strapi/icons';
import { Illo } from './Illo';

export function EmptyState() {
  return (
    <EmptyStateLayout
      icon={<Illo />}
      content="Let's create our first embedding..."
      action={
        <Link to={`/plugins/${PLUGIN_ID}/embeddings`}>
          <Button startIcon={<Plus />}>Create new embedding</Button>
        </Link>
      }
    />
  );
}