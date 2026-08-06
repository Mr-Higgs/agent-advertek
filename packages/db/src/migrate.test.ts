import { describe, expect, it } from "vitest";
import { applyMigrations } from "./migrate.js";
import { createFakeExecutor } from "./test-utils.js";

describe("applyMigrations", () => {
  const migrations = [
    { id: "0001_init", sql: "CREATE TABLE one (id text);" },
    { id: "0002_more", sql: "CREATE TABLE two (id text);" },
  ];

  it("creates the bookkeeping table, then applies pending migrations in order", async () => {
    const executor = createFakeExecutor((text) =>
      text.includes("FROM schema_migrations") ? [{ id: "0001_init" }] : [],
    );

    const applied = await applyMigrations(executor, migrations);

    expect(applied).toEqual(["0002_more"]);
    expect(executor.queries[0]?.text).toContain("CREATE TABLE IF NOT EXISTS schema_migrations");
    const statements = executor.queries.map((query) => query.text);
    expect(statements).toContain("CREATE TABLE two (id text);");
    expect(statements).not.toContain("CREATE TABLE one (id text);");
    expect(executor.queries[executor.queries.length - 1]?.params).toEqual(["0002_more"]);
  });

  it("applies everything when nothing has been recorded yet", async () => {
    const executor = createFakeExecutor();

    const applied = await applyMigrations(executor, migrations);

    expect(applied).toEqual(["0001_init", "0002_more"]);
  });

  it("is a no-op when every migration is already applied", async () => {
    const executor = createFakeExecutor((text) =>
      text.includes("FROM schema_migrations")
        ? [{ id: "0001_init" }, { id: "0002_more" }]
        : [],
    );

    await expect(applyMigrations(executor, migrations)).resolves.toEqual([]);
    expect(executor.queries).toHaveLength(2);
  });
});
