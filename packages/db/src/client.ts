import postgres from "postgres";
import type { DbConfig } from "./config.js";
import type { SqlExecutor } from "./executor.js";

export interface PostgresExecutor extends SqlExecutor {
  close(): Promise<void>;
}

type UnsafeRunner = postgres.Sql["unsafe"];

function adapt(
  unsafe: UnsafeRunner,
  begin?: postgres.Sql["begin"],
): SqlExecutor {
  return {
    async query<T>(text: string, params: readonly unknown[] = []): Promise<readonly T[]> {
      const rows = await unsafe(text, params as postgres.Parameter[]);
      return rows as unknown as readonly T[];
    },
    transaction<T>(fn: (tx: SqlExecutor) => Promise<T>): Promise<T> {
      if (!begin) {
        // Inside a postgres.js transaction the handle only exposes `unsafe`
        // (+ savepoints); nested transactions aren't part of our seam.
        return Promise.reject(
          new Error("nested transactions are not supported by SqlExecutor"),
        );
      }
      return begin((tx) => fn(adapt(tx.unsafe.bind(tx)))) as unknown as Promise<T>;
    },
  };
}

/**
 * Production adapter from postgres.js onto the injected {@link SqlExecutor}
 * seam. `prepare: false` because Supabase's pooler (pgbouncer in transaction
 * mode) does not support prepared statements.
 */
export function createPostgresExecutor(config: DbConfig): PostgresExecutor {
  const sql = postgres(config.connectionString, { prepare: false });
  const executor = adapt(sql.unsafe.bind(sql), sql.begin.bind(sql));
  return {
    ...executor,
    close: () => sql.end(),
  };
}
