import { describe, expect, it } from "vitest";
import { loadChatConfig, tryLoadChatConfig } from "./chat-config";

describe("loadChatConfig", () => {
  it("parses a fully specified environment", () => {
    const config = loadChatConfig({
      ANTHROPIC_API_KEY: "sk-ant-test",
      CHAT_MODEL_ID: "claude-opus-5",
      CHAT_MAX_STEPS: "4",
    });
    expect(config).toEqual({ apiKey: "sk-ant-test", modelId: "claude-opus-5", maxSteps: 4 });
  });

  it("defaults model and step cap", () => {
    const config = loadChatConfig({ ANTHROPIC_API_KEY: "sk-ant-test" });
    expect(config.modelId).toBe("claude-sonnet-5");
    expect(config.maxSteps).toBe(8);
  });

  it("throws a descriptive error when the key is missing", () => {
    expect(() => loadChatConfig({})).toThrow(/Invalid chat configuration.*ANTHROPIC_API_KEY/s);
  });

  it("rejects a non-numeric step cap", () => {
    expect(() =>
      loadChatConfig({ ANTHROPIC_API_KEY: "sk-ant-test", CHAT_MAX_STEPS: "lots" }),
    ).toThrow(/CHAT_MAX_STEPS/);
  });
});

describe("tryLoadChatConfig", () => {
  it("returns undefined without a key", () => {
    expect(tryLoadChatConfig({})).toBeUndefined();
    expect(tryLoadChatConfig({ ANTHROPIC_API_KEY: "" })).toBeUndefined();
  });

  it("returns the config when the key is present", () => {
    expect(tryLoadChatConfig({ ANTHROPIC_API_KEY: "sk-ant-test" })?.apiKey).toBe("sk-ant-test");
  });

  it("still throws when the key is present but a companion value is invalid", () => {
    expect(() =>
      tryLoadChatConfig({ ANTHROPIC_API_KEY: "sk-ant-test", CHAT_MAX_STEPS: "-1" }),
    ).toThrow(/CHAT_MAX_STEPS/);
  });
});
