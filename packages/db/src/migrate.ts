import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { SqlExecutor } from "./executor.js";

export interface Migration {
  readonly id: string;
  readonly sql: string;
}

const CREATE_MIGRATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  id text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
)
`;

/**
 * Applies each not-yet-applied migration, in order, recording it in
 * `schema_migrations`. Each migration and its bookkeeping row commit in one
 * transaction so a failed migration never leaves a half-recorded state.
 */
export async function applyMigrations(
  executor: SqlExecutor,
  migrations: readonly Migration[],
): Promise<readonly string[]> {
  await executor.query(CREATE_MIGRATIONS_TABLE);
  const appliedRows = await executor.query<{ id: string }>(
    "SELECT id FROM schema_migrations",
  );
  const appliedIds = new Set(appliedRows.map((row) => row.id));

  const newlyApplied: string[] = [];
  for (const migration of migrations) {
    if (appliedIds.has(migration.id)) {
      continue;
    }
    await executor.transaction(async (tx) => {
      await tx.query(migration.sql);
      await tx.query("INSERT INTO schema_migrations (id) VALUES ($1)", [migration.id]);
    });
    newlyApplied.push(migration.id);
  }
  return newlyApplied;
}

/** Reads `*.sql` migrations from a directory, sorted by filename. */
export function loadMigrationsFromDir(dir: string): Migration[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => ({
      id: name.replace(/\.sql$/, ""),
      sql: readFileSync(join(dir, name), "utf8"),
    }));
}

/**
 * The migrations shipped inside this package (`migrations/` sits next to
 * `src/` and `dist/`, so one level up resolves from either). Deliberately
 * avoids the `new URL("...", import.meta.url)` pattern, which bundlers
 * (Turbopack) treat as a static asset reference and fail to resolve.
 */
export function loadPackageMigrations(): Migration[] {
  const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");
  return loadMigrationsFromDir(dir);
}
