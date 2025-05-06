import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { tools } from "./tools";

const server = new McpServer({
  name: "wallet-mcp",
  version: "1.0.0",
  capabilities: {
    tools: {},
  },
});

for (const tool of tools) {
  server.tool(tool.name, tool.description, tool.paramSchema, tool.handle);
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Wallet MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
});
