import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import {
  type ChatStorage,
  deleteConversation,
  importLegacyChat,
  readIndex,
  readMessages,
  saveConversation,
  titleFor,
} from "./chat-history";

function fakeStorage(): ChatStorage & { readonly map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => { map.set(key, value); },
    removeItem: (key) => { map.delete(key); },
  };
}

function userMessage(text: string, id = "m1"): UIMessage {
  return { id, role: "user", parts: [{ type: "text", text }] };
}

describe("titleFor", () => {
  it("uses the first non-artwork line of the first user message, truncated", () => {
    expect(titleFor([userMessage("Artwork: https://x/y.png\n500 business cards, matte")])).toBe(
      "500 business cards, matte",
    );
    const long = "a".repeat(60);
    expect(titleFor([userMessage(long)])).toBe(`${"a".repeat(39)}…`);
  });

  it("falls back when there is no usable text", () => {
    expect(titleFor([])).toBe("Untitled chat");
    expect(titleFor([userMessage("Artwork: https://x/y.png")])).toBe("Untitled chat");
  });
});

describe("saveConversation", () => {
  it("writes the chat, indexes it newest first, and reads back", () => {
    const storage = fakeStorage();
    saveConversation(storage, "a", [userMessage("first")], 1);
    const index = saveConversation(storage, "b", [userMessage("second")], 2);
    expect(index.map((c) => c.id)).toEqual(["b", "a"]);
    expect(readIndex(storage)).toEqual(index);
    expect(readMessages(storage, "a")).toEqual([userMessage("first")]);
  });

  it("moves an updated chat to the top and refreshes its title", () => {
    const storage = fakeStorage();
    saveConversation(storage, "a", [userMessage("first")], 1);
    saveConversation(storage, "b", [userMessage("second")], 2);
    const index = saveConversation(storage, "a", [userMessage("first, revised")], 3);
    expect(index.map((c) => c.id)).toEqual(["a", "b"]);
    expect(index[0]?.title).toBe("first, revised");
  });

  it("removes the entry and chat when messages are empty", () => {
    const storage = fakeStorage();
    saveConversation(storage, "a", [userMessage("first")], 1);
    expect(saveConversation(storage, "a", [], 2)).toEqual([]);
    expect(readMessages(storage, "a")).toEqual([]);
    expect([...storage.map.keys()]).toEqual(["advertek-demo-chats-v1"]);
  });

  it("caps the index at 20 and prunes evicted chats", () => {
    const storage = fakeStorage();
    for (let i = 0; i < 21; i += 1) {
      saveConversation(storage, `c${String(i)}`, [userMessage(`chat ${String(i)}`)], i);
    }
    const index = readIndex(storage);
    expect(index).toHaveLength(20);
    expect(index[0]?.id).toBe("c20");
    expect(index.some((c) => c.id === "c0")).toBe(false);
    expect(readMessages(storage, "c0")).toEqual([]);
    expect(readMessages(storage, "c1")).toHaveLength(1);
  });

  it("returns an empty index when storage holds garbage", () => {
    const storage = fakeStorage();
    storage.setItem("advertek-demo-chats-v1", "{not json");
    expect(readIndex(storage)).toEqual([]);
    storage.setItem("advertek-demo-chats-v1", '{"nope":1}');
    expect(readIndex(storage)).toEqual([]);
  });
});

describe("deleteConversation", () => {
  it("drops the entry and its chat", () => {
    const storage = fakeStorage();
    saveConversation(storage, "a", [userMessage("first")], 1);
    saveConversation(storage, "b", [userMessage("second")], 2);
    expect(deleteConversation(storage, "a").map((c) => c.id)).toEqual(["b"]);
    expect(readMessages(storage, "a")).toEqual([]);
    expect(readIndex(storage).map((c) => c.id)).toEqual(["b"]);
  });
});

describe("importLegacyChat", () => {
  it("moves the old single chat into the index and drops the legacy key", () => {
    const storage = fakeStorage();
    storage.setItem("advertek-demo-chat-v1", JSON.stringify([userMessage("old chat")]));
    const index = importLegacyChat(storage, "legacy", 5);
    expect(index.map((c) => [c.id, c.title])).toEqual([["legacy", "old chat"]]);
    expect(readMessages(storage, "legacy")).toEqual([userMessage("old chat")]);
    expect(storage.map.has("advertek-demo-chat-v1")).toBe(false);
  });

  it("leaves the index alone when there is nothing to import", () => {
    const storage = fakeStorage();
    saveConversation(storage, "a", [userMessage("first")], 1);
    expect(importLegacyChat(storage, "legacy", 5).map((c) => c.id)).toEqual(["a"]);
  });
});
