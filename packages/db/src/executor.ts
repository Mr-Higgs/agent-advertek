/**
 * Minimal SQL surface every persistence module in this package is written
 * against. Per repo convention all I/O is an injected dependency: production
 * wiring adapts a `postgres` (postgres.js) client onto this interface in
 * `client.ts`, and unit tests supply a recording fake — no unit test ever
 * touches a real database.
 *
 * Money convention: bigint minor units cross the SQL boundary as base-10
 * strings into `numeric(78, 0)` columns — never floats, never JS `number`.
 */
export interface SqlExecutor {
  query<T>(text: string, params?: readonly unknown[]): Promise<readonly T[]>;
  transaction<T>(fn: (tx: SqlExecutor) => Promise<T>): Promise<T>;
}
