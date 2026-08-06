import { z } from "zod";

/**
 * Centralized config loader for the Postgres persistence layer (Supabase-hosted
 * in deployment). `DATABASE_URL` is the only input — a standard
 * postgres:// connection string (Supabase pooler URLs work; pair them with
 * `prepare: false`, which `createPostgresExecutor` already does).
 */
const dbEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
});

export interface DbConfig {
  readonly connectionString: string;
}

export function loadDbConfig(
  env: NodeJS.ProcessEnv = process.env,
): DbConfig {
  const parsed = dbEnvSchema.safeParse({
    DATABASE_URL: env["DATABASE_URL"],
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid database configuration: ${details}`);
  }

  return { connectionString: parsed.data.DATABASE_URL };
}
