import { registerAdvertekTools } from "@advertek/mcp-server";
import { createMcpHandler } from "mcp-handler";
import { guardApiRequest } from "@/lib/api-guard";
import { createQuoteExecutors } from "@/lib/quotes";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Remote MCP endpoint (Streamable HTTP) — the hosted counterpart of
 * `packages/mcp-server`'s stdio entry. Tools come from the same
 * `registerAdvertekTools` registration, so both transports serve identical
 * behavior; tool descriptions remain the agent's only documentation.
 *
 * Pricing follows the config-gated wiring in `lib/quotes.ts`: real upstreams
 * when provisioned, inspection mocks otherwise.
 */
const handler = createMcpHandler(
  (server) => {
    registerAdvertekTools(server, createQuoteExecutors());
  },
  {},
  { basePath: "/api" },
);

async function guardedHandler(request: Request): Promise<Response> {
  return guardApiRequest(request, "mcp") ?? (await handler(request));
}

export {
  guardedHandler as GET,
  guardedHandler as POST,
  guardedHandler as DELETE,
};
