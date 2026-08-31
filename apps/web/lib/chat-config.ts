import { z } from "zod";

const chatEnvSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
  CHAT_MODEL_ID: z.string().min(1).optional(),
  CHAT_MAX_STEPS: z.coerce.number().int().positive().optional(),
});

export interface ChatConfig {
  readonly apiKey: string;
  readonly modelId: string;
  /** Upper bound on model/tool round-trips per request — caps runaway loops on a public route. */
  readonly maxSteps: number;
}

const DEFAULT_MODEL_ID = "claude-sonnet-5";
const DEFAULT_MAX_STEPS = 8;

/** `Record` rather than `NodeJS.ProcessEnv` so tests can pass bare fixtures. */
export function loadChatConfig(env: Record<string, string | undefined> = process.env): ChatConfig {
  const parsed = chatEnvSchema.safeParse({
    ANTHROPIC_API_KEY: env["ANTHROPIC_API_KEY"],
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
    modelId: parsed.data.CHAT_MODEL_ID ?? DEFAULT_MODEL_ID,
    maxSteps: parsed.data.CHAT_MAX_STEPS ?? DEFAULT_MAX_STEPS,
  };
}

/**
 * Vercel Blob read-write token for artwork uploads. `undefined` disables the
 * upload route (503) without breaking the rest of a keyless deployment.
 */
export function tryLoadBlobToken(
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  const token = env["BLOB_READ_WRITE_TOKEN"];
  return token === undefined || token.length === 0 ? undefined : token;
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
