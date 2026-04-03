#!/usr/bin/env node

/**
 * Google Play Console MCP Server
 *
 * Provides tools to manage Google Play store listings and their localizations
 * via the Google Play Developer API v3.
 *
 * Authentication: service-account JSON key file.
 *   Set GOOGLE_SERVICE_ACCOUNT_KEY_FILE (or GOOGLE_APPLICATION_CREDENTIALS)
 *   to the path of your key file.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerEditTools } from "./tools/edits.js";
import { registerListingTools } from "./tools/listings.js";

const server = new McpServer({
  name: "google-play-console-mcp-server",
  version: "1.0.0",
});

// Register all tools
registerEditTools(server);
registerListingTools(server);

// Start on stdio
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Google Play Console MCP server running via stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
