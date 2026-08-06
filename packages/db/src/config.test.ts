import { describe, expect, it } from "vitest";
import { loadDbConfig } from "./config.js";

describe("loadDbConfig", () => {
  it("loads a valid DATABASE_URL", () => {
    const config = loadDbConfig({
      DATABASE_URL: "postgres://user:pass@db.example.supabase.co:5432/postgres",
    });
    expect(config.connectionString).toBe(
      "postgres://user:pass@db.example.supabase.co:5432/postgres",
    );
  });

  it("throws when DATABASE_URL is missing", () => {
    expect(() => loadDbConfig({})).toThrow(/Invalid database configuration/);
  });

  it("throws when DATABASE_URL is empty", () => {
    expect(() => loadDbConfig({ DATABASE_URL: "" })).toThrow(
      /Invalid database configuration/,
    );
  });
});
