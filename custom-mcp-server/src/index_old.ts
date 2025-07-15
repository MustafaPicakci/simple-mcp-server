import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import axios from "axios";
import { randomUUID } from "crypto";
import express from "express";
import { z } from "zod";

const API_BASE = "localhost:3000/api";
// const USER_AGENT = "weather-app/1.0";

const port = 3001;

const app = express();

const server = new McpServer({
  name: "Lead",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

server.tool(
  "create-lead",
  "Call this tool to create new lead",
  {
    payload: {
      name: z.string().describe("customer name"),
      email: z.string().email().describe("customer email"),
      phone: z.string().describe("customer phone number"),
    },
  },
  async ({ payload }) => {
    const url = `${API_BASE}/lead`;
    const response = await axios.post(url, payload);
    if (!response) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve  data",
          },
        ],
      };
    }
    return {
      content: [
        {
          type: "text",
          text: response.data,
        },
      ],
    };
  }
);

// app.all("/mcp", async (req, res) => {
//   const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID() });
//   server.connect(transport).catch(console.error);
// });

app.get("/mcp", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  // Discovery aşamasında n8n’in GET isteğini SSE üzerinden düşürmesini sağla
  const transport = new SSEServerTransport("/mcp", res);
  server.connect(transport).catch(console.error);
});

app.post("/mcp", async (req, res) => {
  // Transport'u isteğe bağla
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });

  const connection = server.connect(transport);
  // Geçerli istekle işlem yapılabilmesi için:
  await transport.handleRequest(req, res);
});

app.listen(port, () => {
  console.log(`MCP SSE server listening at http://localhost:${port}/mcp`);
});
