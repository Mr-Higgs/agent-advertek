import { z } from "zod";

const accessEnvSchema = z.object({
  RAIL_ACCESS_ENDPOINT: z.string().url().optional(),
});

export interface AccessConfig {
  /** Optional CRM/inbox endpoint for qualified access submissions. */
  readonly forwardEndpoint: string | undefined;
}

export function loadAccessConfig(
  env: Record<string, string | undefined> = process.env,
): AccessConfig {
  const parsed = accessEnvSchema.safeParse({
    RAIL_ACCESS_ENDPOINT: env["RAIL_ACCESS_ENDPOINT"],
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid access config: ${details}`);
  }

  return {
    forwardEndpoint:
      parsed.data.RAIL_ACCESS_ENDPOINT === undefined ||
      parsed.data.RAIL_ACCESS_ENDPOINT.length === 0
        ? undefined
        : parsed.data.RAIL_ACCESS_ENDPOINT,
  };
}
