import type { Core } from "@strapi/strapi";

const PLUGIN_ID = "strapi-content-embeddings";

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  // Add embedding relation to all content types
  Object.values(strapi.contentTypes).forEach((contentType: any) => {
    // Skip internal content types and the embedding content type itself
    if (
      contentType.uid.startsWith("admin::") ||
      contentType.uid.startsWith("strapi::") ||
      contentType.uid === `plugin::${PLUGIN_ID}.embedding`
    ) {
      return;
    }

    // Add morphOne relation to content type
    contentType.attributes.embedding = {
      type: "relation",
      relation: "morphOne",
      target: `plugin::${PLUGIN_ID}.embedding`,
      morphBy: "related",
      private: false,
      configurable: false,
    };
  });
};

export default register;
