import { z } from "zod";

const chatEnvSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
  /** Required by identity-linked API keys; workspace-scoped keys omit it. */
  ANTHROPIC_WORKSPACE_ID: z.string().min(1).optional(),
  CHAT_MODEL_ID: z.string().min(1).optional(),
  CHAT_MAX_STEPS: z.coerce.number().int().positive().optional(),
});

export interface ChatConfig {
  readonly apiKey: string;
  readonly workspaceId?: string;
  readonly modelId: string;
  /** Upper bound on model/tool round-trips per request — caps runaway loops on a public route. */
  readonly maxSteps: number;
}

const DEFAULT_MODEL_ID = "claude-sonnet-5";
const DEFAULT_MAX_STEPS = 8;

/** `Record` rather than `NodeJS.ProcessEnv` so tests can pass bare fixtures. */
export function loadChatConfig(env: Record<string, string | undefined> = process.env): ChatConfig {
  // An empty env value means "unset", matching how tryLoadChatConfig gates.
  const nonEmpty = (value: string | undefined): string | undefined =>
    value === undefined || value.length === 0 ? undefined : value;

  const parsed = chatEnvSchema.safeParse({
    ANTHROPIC_API_KEY: nonEmpty(env["ANTHROPIC_API_KEY"]),
    ANTHROPIC_WORKSPACE_ID: nonEmpty(env["ANTHROPIC_WORKSPACE_ID"]),
    CHAT_MODEL_ID: env["CHAT_MODEL_ID"],
    CHAT_MAX_STEPS: env["CHAT_MAX_STEPS"],
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid chat configuration: ${details}`);
  }

  return {
    apiKey: parsed.data.ANTHROPIC_API_KEY,
    ...(parsed.data.ANTHROPIC_WORKSPACE_ID !== undefined
      ? { workspaceId: parsed.data.ANTHROPIC_WORKSPACE_ID }
      : {}),
    modelId: parsed.data.CHAT_MODEL_ID ?? DEFAULT_MODEL_ID,
    maxSteps: parsed.data.CHAT_MAX_STEPS ?? DEFAULT_MAX_STEPS,
  };
}

export interface ArtworkStorageConfig {
  /** Supabase project URL, e.g. https://xyz.supabase.co */
  readonly url: string;
  /** Service-role key — server-side only, never sent to the browser. */
  readonly serviceRoleKey: string;
}

/**
 * Supabase Storage credentials for artwork uploads. `undefined` disables the
 * upload route (503) without breaking the rest of a keyless deployment.
 */
export function tryLoadArtworkStorageConfig(
  env: Record<string, string | undefined> = process.env,
): ArtworkStorageConfig | undefined {
  const url = env["NEXT_PUBLIC_SUPABASE_URL"] ?? env["SUPABASE_URL"];
  const serviceRoleKey = env["SUPABASE_SERVICE_ROLE_KEY"];
  if (url === undefined || url.length === 0 || serviceRoleKey === undefined || serviceRoleKey.length === 0) {
    return undefined;
  }
  return { url: url.replace(/\/$/, ""), serviceRoleKey };
}

/**
 * `undefined` when no ANTHROPIC_API_KEY is provisioned — the chat route turns
 * that into a clean 503 so a keyless demo deployment still serves everything
 * else. A key with an invalid companion value still throws.
 */
export function tryLoadChatConfig(
  env: Record<string, string | undefined> = process.env,
): ChatConfig | undefined {
  const key = env["ANTHROPIC_API_KEY"];
  if (key === undefined || key.length === 0) {
    return undefined;
  }
  return loadChatConfig(env);
}
