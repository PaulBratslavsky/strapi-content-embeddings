import type { Core } from "@strapi/strapi";
import { pluginManager } from "./plugin-manager";
import { createMcpServer } from "./mcp/server";

const PLUGIN_ID = "strapi-content-embeddings";
const OAUTH_PLUGIN_ID = "strapi-oauth-mcp-manager";

/**
 * Fallback auth middleware for when OAuth manager plugin is not installed.
 * Requires Bearer token (Strapi API token) for MCP endpoints.
 */
function createFallbackAuthMiddleware(strapi: Core.Strapi) {
  const mcpPath = `/api/${PLUGIN_ID}/mcp`;

  return async (ctx: any, next: () => Promise<void>) => {
    // Only apply to this plugin's MCP endpoint
    if (!ctx.path.startsWith(mcpPath)) {
      return next();
    }

    const authHeader = ctx.request.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      ctx.status = 401;
      ctx.body = {
        error: "Unauthorized",
        message: "Bearer token required. Provide a Strapi API token.",
      };
      return;
    }

    // Extract token and set it for the controller
    const token = authHeader.slice(7);
    ctx.state.strapiToken = token;
    ctx.state.authMethod = "api-token";

    return next();
  };
}

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  // Register RBAC actions for the plugin
  const actions = [
    {
      section: "plugins",
      displayName: "Read",
      uid: "read",
      pluginName: PLUGIN_ID,
    },
    {
      section: "plugins",
      displayName: "Update",
      uid: "update",
      pluginName: PLUGIN_ID,
    },
    {
      section: "plugins",
      displayName: "Create",
      uid: "create",
      pluginName: PLUGIN_ID,
    },
    {
      section: "plugins",
      displayName: "Delete",
      uid: "delete",
      pluginName: PLUGIN_ID,
    },
    {
      section: "plugins",
      displayName: "Chat",
      uid: "chat",
      pluginName: PLUGIN_ID,
    },
  ];

  await strapi.admin.services.permission.actionProvider.registerMany(actions);

  // Initialize the plugin manager with configuration
  const pluginConfig = strapi.config.get(`plugin::${PLUGIN_ID}`) as {
    openAIApiKey?: string;
    neonConnectionString?: string;
    embeddingModel?: string;
  };

  if (pluginConfig?.openAIApiKey && pluginConfig?.neonConnectionString) {
    try {
      await pluginManager.initialize({
        openAIApiKey: pluginConfig.openAIApiKey,
        neonConnectionString: pluginConfig.neonConnectionString,
        embeddingModel: pluginConfig.embeddingModel as any,
      });

      // Store plugin manager on strapi for MCP tools to access
      (strapi as any).contentEmbeddingsManager = pluginManager;

      strapi.log.info(`[${PLUGIN_ID}] Plugin initialized successfully`);
    } catch (error) {
      strapi.log.error(`[${PLUGIN_ID}] Failed to initialize:`, error);
    }
  } else {
    strapi.log.warn(
      `[${PLUGIN_ID}] Missing configuration. Set openAIApiKey and neonConnectionString in plugin config.`
    );
  }

  // Initialize MCP server
  const plugin = strapi.plugin(PLUGIN_ID) as any;
  plugin.createMcpServer = () => createMcpServer(strapi);
  plugin.sessions = new Map();

  // Check if OAuth manager is installed
  const oauthPlugin = strapi.plugin(OAUTH_PLUGIN_ID);

  if (oauthPlugin) {
    strapi.log.info(`[${PLUGIN_ID}] OAuth manager detected - OAuth + API token auth enabled`);
  } else {
    // No OAuth manager - use fallback auth
    const fallbackMiddleware = createFallbackAuthMiddleware(strapi);
    strapi.server.use(fallbackMiddleware);
    strapi.log.info(`[${PLUGIN_ID}] Using API token authentication (OAuth manager not installed)`);
  }

  strapi.log.info(`[${PLUGIN_ID}] MCP endpoint available at: /api/${PLUGIN_ID}/mcp`);
};

export default bootstrap;
