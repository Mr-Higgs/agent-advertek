import type { UIMessage } from "ai";

/**
 * Saved /demo conversations in browser storage: one index key holding
 * `{ id, title, updatedAt }` newest first, plus one key per chat holding its
 * `UIMessage[]`, so a streaming save only rewrites the active chat.
 */

export interface ConversationMeta {
  readonly id: string;
  readonly title: string;
  readonly updatedAt: number;
}

/** The subset of `Storage` we touch, so tests pass an in-memory fake. */
export interface ChatStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const INDEX_KEY = "advertek-demo-chats-v1";
/** Pre-sidebar single-chat key; imported once, then removed. */
const LEGACY_KEY = "advertek-demo-chat-v1";
const CHAT_KEY_PREFIX = "advertek-demo-chat-v1:";
// ponytail: hard cap; localStorage is ~5MB and a catalog-heavy chat runs ~100KB.
const MAX_CONVERSATIONS = 20;
const TITLE_LENGTH = 40;
const UNTITLED = "Untitled chat";

const chatKey = (id: string): string => `${CHAT_KEY_PREFIX}${id}`;

function readArray<T>(storage: ChatStorage, key: string): T[] {
  try {
    const raw = storage.getItem(key);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeIndex(storage: ChatStorage, index: readonly ConversationMeta[]): void {
  storage.setItem(INDEX_KEY, JSON.stringify(index));
}

export function titleFor(messages: readonly UIMessage[]): string {
  const first = messages.find((message) => message.role === "user");
  const part = first?.parts.find((p) => p.type === "text");
  const line = part?.text
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0 && !l.startsWith("Artwork: "));
  if (line === undefined) return UNTITLED;
  return line.length > TITLE_LENGTH ? `${line.slice(0, TITLE_LENGTH - 1).trimEnd()}…` : line;
}

export function readIndex(storage: ChatStorage): ConversationMeta[] {
  return readArray<ConversationMeta>(storage, INDEX_KEY);
}

export function readMessages(storage: ChatStorage, id: string): UIMessage[] {
  return readArray<UIMessage>(storage, chatKey(id));
}

/** Persist a chat and return the updated index. Empty chats are removed, not indexed. */
export function saveConversation(
  storage: ChatStorage,
  id: string,
  messages: readonly UIMessage[],
  now: number,
): ConversationMeta[] {
  const rest = readIndex(storage).filter((c) => c.id !== id);
  try {
    if (messages.length === 0) {
      storage.removeItem(chatKey(id));
      writeIndex(storage, rest);
      return rest;
    }
    const next = [{ id, title: titleFor(messages), updatedAt: now }, ...rest];
    const kept = next.slice(0, MAX_CONVERSATIONS);
    for (const evicted of next.slice(MAX_CONVERSATIONS)) storage.removeItem(chatKey(evicted.id));
    storage.setItem(chatKey(id), JSON.stringify(messages));
    writeIndex(storage, kept);
    return kept;
  } catch {
    // Storage may be unavailable or full; the in-memory chat still works.
    return readIndex(storage);
  }
}

export function deleteConversation(storage: ChatStorage, id: string): ConversationMeta[] {
  const rest = readIndex(storage).filter((c) => c.id !== id);
  try {
    storage.removeItem(chatKey(id));
    writeIndex(storage, rest);
  } catch {
    // Best effort.
  }
  return rest;
}

/** Import the pre-sidebar single chat as a conversation, if present. Returns the index. */
export function importLegacyChat(storage: ChatStorage, id: string, now: number): ConversationMeta[] {
  const messages = readArray<UIMessage>(storage, LEGACY_KEY);
  const index = messages.length > 0 ? saveConversation(storage, id, messages, now) : readIndex(storage);
  try {
    storage.removeItem(LEGACY_KEY);
  } catch {
    // Best effort.
  }
  return index;
}
