import { registerAdvertekTools } from "@advertek/mcp-server";
import { createMcpHandler } from "mcp-handler";
import { createQuoteExecutors } from "@/lib/quotes";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Remote MCP endpoint (Streamable HTTP) — the hosted counterpart of
 * `packages/mcp-server`'s stdio entry. Tools come from the same
 * `registerAdvertekTools` registration, so both transports serve identical
 * behavior; tool descriptions remain the agent's only documentation.
 *
 * @blocker STEP_11 — quote pricing runs on the shared mocked wiring in
 * `lib/quotes.ts` until real AdvertekPricingClient / SpotRateClient
 * integrations land.
 */
const handler = createMcpHandler(
  (server) => {
    registerAdvertekTools(server, createQuoteExecutors());
  },
  {},
  { basePath: "/api" },
);

export { handler as GET, handler as POST, handler as DELETE };
