import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { authenticateApiRequest } from "@/lib/api/auth";
import { apiError, rateHeaders } from "@/lib/api/http";
import { createGamebitsMcp } from "@/lib/api/mcp";

export const dynamic = "force-dynamic";

async function handle(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth.ok) return auth.response;

  const server = createGamebitsMcp();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
    maxRequestBodySize: 64 * 1024,
  });

  try {
    await server.connect(transport);
    const response = await transport.handleRequest(request);
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(rateHeaders(auth.limit))) {
      headers.set(key, value);
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    console.error("[api] mcp failed", error);
    return apiError("unavailable", "Try again in a moment.", 503);
  } finally {
    await server.close().catch((error) => {
      console.error("[api] mcp close failed", error);
    });
  }
}

export function POST(request: Request) {
  return handle(request);
}

export function GET(request: Request) {
  return handle(request);
}

export function DELETE(request: Request) {
  return handle(request);
}
