import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import axios from "axios";
import express from "express";
import { z } from "zod";
const API_BASE = "http://localhost:3000/api";
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
    name: z.string().describe("name"),
    email: z.string().describe("email"),
    phone: z.string().describe("phone number"),
  },
  async (payload) => {
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
          text: `completed`,
        },
      ],
    };
  }
);

const transports = {};
app.all("/mcp", async (req, res) => {
  console.log(`Received ${req.method} request to /mcp`);

  try {
    // Check for existing session ID
    const sessionId = req.headers["mcp-session-id"];
    let transport;
    console.log(sessionId);

    if (sessionId && transports[sessionId]) {
      // Check if the transport is of the correct type
      const existingTransport = transports[sessionId];
      if (existingTransport instanceof StreamableHTTPServerTransport) {
        // Reuse existing transport
        transport = existingTransport;
      } else {
        // Transport exists but is not a StreamableHTTPServerTransport (could be SSEServerTransport)
        res.status(400).json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Bad Request: Session exists but uses a different transport protocol",
          },
          id: null,
        });
        return;
      }
    } else if (!sessionId && req.method === "POST" && isInitializeRequest(req.body)) {
      const eventStore = new InMemoryEventStore();
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        eventStore, // Enable resumability
        onsessioninitialized: (sessionId) => {
          // Store the transport by session ID when session is initialized
          console.log(`StreamableHTTP session initialized with ID: ${sessionId}`);
          transports[sessionId] = transport;
        },
      });

      // Set up onclose handler to clean up transport when closed
      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && transports[sid]) {
          console.log(`Transport closed for session ${sid}, removing from transports map`);
          delete transports[sid];
        }
      };

      // Connect the transport to the MCP server

      await server.connect(transport);
    } else {
      // Invalid request - no session ID or not initialization request
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: No valid session ID provided",
        },
        id: null,
      });
      return;
    }

    // Handle the request with the transport
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("Error handling MCP request:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      });
    }
  }
});

//=============================================================================
// DEPRECATED HTTP+SSE TRANSPORT (PROTOCOL VERSION 2024-11-05)
//=============================================================================

app.get("/sse", async (req, res) => {
  console.log("Received GET request to /sse (deprecated SSE transport)");
  const transport = new SSEServerTransport("/messages", res);
  transports[transport.sessionId] = transport;
  res.on("close", () => {
    delete transports[transport.sessionId];
  });
  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId;
  let transport;
  const existingTransport = transports[sessionId];
  if (existingTransport instanceof SSEServerTransport) {
    // Reuse existing transport
    transport = existingTransport;
  } else {
    // Transport exists but is not a SSEServerTransport (could be StreamableHTTPServerTransport)
    res.status(400).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Bad Request: Session exists but uses a different transport protocol",
      },
      id: null,
    });
    return;
  }
  if (transport) {
    await transport.handlePostMessage(req, res, req.body);
  } else {
    res.status(400).send("No transport found for sessionId");
  }
});

app.listen(port, () => {
  console.log(`MCP SSE server listening at http://localhost:${port}/mcp`);
});
