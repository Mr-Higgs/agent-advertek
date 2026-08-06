import {
  createPostgresExecutor,
  loadDbConfig,
  type PostgresExecutor,
} from "@advertek/db";

/**
 * Lazily-initialized shared Postgres executor for route handlers (one per
 * serverless instance). Config comes from `@advertek/db`'s `config.ts` —
 * per repo convention, nothing else in this app reads `process.env` for the
 * database.
 */
let executor: PostgresExecutor | undefined;

export function getDb(): PostgresExecutor {
  executor ??= createPostgresExecutor(loadDbConfig());
  return executor;
}
