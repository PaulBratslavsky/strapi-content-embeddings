import { Page } from '@strapi/strapi/admin';
import { Routes, Route } from 'react-router-dom';

import { HomePage } from './HomePage';
import CreateEmbeddings from './CreateEmbeddings';
import EmbeddingDetails from './EmbeddingDetails';

const App = () => {
  return (
    <Routes>
      <Route index element={<HomePage />} />
      <Route path="*" element={<Page.Error />} />
      <Route path="/embeddings" element={<CreateEmbeddings />} />
      <Route path="/embeddings/:id" element={<EmbeddingDetails />} />
    </Routes>
  );
};

export { App };
