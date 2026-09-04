"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { themes } from "@/components/theme";
import { CropMark } from "@/components/icons";
import { MessageParts } from "./message-parts";
import { demoPage } from "@/lib/site-config";
import { track } from "@/lib/analytics";
import {
  type ConversationMeta,
  deleteConversation,
  importLegacyChat,
  readMessages,
  saveConversation,
} from "@/lib/chat-history";

const t = themes.light;

interface Attachment {
  readonly name: string;
  readonly url: string;
  readonly mediaType: string;
}

/** Image types Claude can view; TIFF/SVG/PDF upload fine but stay URL-only. */
const VISION_MEDIA_TYPES = ["image/png", "image/jpeg", "image/webp"];

interface History {
  readonly index: readonly ConversationMeta[];
  readonly activeId: string;
}

const newId = (): string => crypto.randomUUID();
const noSubscribe = (): (() => void) => () => {};

export function DemoChat() {
  // Saved chats live in localStorage, so the shell only mounts after hydration;
  // the server and first client render both show the placeholder.
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
  return hydrated ? (
    <ChatShell />
  ) : (
    <div className="border border-ink/10 min-h-[420px]" style={{ backgroundColor: t.bg }} />
  );
}

function ChatShell() {
  const [history, setHistory] = useState<History>(() => {
    const index = importLegacyChat(localStorage, newId(), Date.now());
    return { index, activeId: index[0]?.id ?? newId() };
  });

  const { activeId } = history;
  const initialMessages = useMemo(() => readMessages(localStorage, activeId), [activeId]);

  const onMessagesChange = useCallback((id: string, messages: readonly UIMessage[]) => {
    const index = saveConversation(localStorage, id, messages, Date.now());
    setHistory((prev) => ({ ...prev, index }));
  }, []);

  const remove = (id: string): void => {
    const index = deleteConversation(localStorage, id);
    setHistory((prev) => ({ index, activeId: prev.activeId === id ? newId() : prev.activeId }));
  };

  const select = (id: string): void => {
    setHistory((prev) => ({ ...prev, activeId: id }));
  };

  return (
    <div className="border border-ink/10 md:flex" style={{ backgroundColor: t.bg, color: t.text }}>
      <aside
        className="shrink-0 border-b md:border-b-0 md:border-r md:w-56 px-4 py-4"
        style={{ borderColor: t.line }}
      >
        <button
          type="button"
          className="w-full font-mono text-[11px] uppercase tracking-widest px-4 py-2"
          style={{ backgroundColor: t.accent, color: t.accentContrast }}
          onClick={() => { select(newId()); }}
        >
          New chat
        </button>
        {history.index.length > 0 ? (
          <>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] mt-5 mb-1" style={{ color: t.mid }}>
              History
            </div>
            <ul className="max-h-40 md:max-h-[560px] overflow-y-auto">
              {history.index.map((conversation) => {
                const active = conversation.id === activeId;
                return (
                  <li key={conversation.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      title={conversation.title}
                      aria-current={active ? "true" : undefined}
                      className="flex-1 min-w-0 truncate text-left text-[13px] leading-relaxed py-1.5 hover:underline"
                      style={{ color: active ? t.text : t.midStrong, fontWeight: active ? 600 : 400 }}
                      onClick={() => { select(conversation.id); }}
                    >
                      {conversation.title}
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${conversation.title}`}
                      className="font-mono text-base leading-none px-2 py-1.5 hover:text-signal"
                      style={{ color: t.mid }}
                      onClick={() => { remove(conversation.id); }}
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}
      </aside>
      <div className="flex-1 min-w-0">
        {/* ponytail: keying on the id remounts the pane, which resets input,
            attachments, analytics refs, and order trackers for free. Switching
            mid-stream abandons that response; the partial reply already saved
            still renders. */}
        <ChatPane
          key={activeId}
          id={activeId}
          initialMessages={initialMessages}
          onMessagesChange={onMessagesChange}
        />
      </div>
    </div>
  );
}

interface ChatPaneProps {
  readonly id: string;
  readonly initialMessages: UIMessage[];
  readonly onMessagesChange: (id: string, messages: readonly UIMessage[]) => void;
}

function ChatPane({ id, initialMessages, onMessagesChange }: ChatPaneProps) {
  const { messages, sendMessage, status, error, regenerate, clearError } = useChat({
    id,
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<readonly Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | undefined>(undefined);
  const [dragging, setDragging] = useState(false);
  const mounted = useRef(false);
  const startedTracked = useRef(false);
  const completedTracked = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Skip the mount pass so reopening a chat doesn't rewrite it or bump it to the top.
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    onMessagesChange(id, messages);
  }, [id, messages, onMessagesChange]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, status]);

  useEffect(() => {
    if (completedTracked.current || status !== "ready") return;
    const hasAssistant = messages.some((message) => message.role === "assistant");
    if (hasAssistant) {
      track("demo_completed");
      completedTracked.current = true;
    }
  }, [messages, status]);

  const busy = status === "submitted" || status === "streaming";
  const empty = messages.length === 0;

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      const artworkLines = attachments.map((a) => `Artwork: ${a.url}`);
      if (trimmed.length === 0 && artworkLines.length === 0) return;
      if (!startedTracked.current) {
        track("demo_started", { source: (demoPage.suggestedPrompts as readonly string[]).includes(trimmed) ? "example" : "custom" });
        startedTracked.current = true;
      }
      // Viewable images also go up as file parts so the model can see the
      // artwork; the "Artwork:" text line stays the canonical asset URL for
      // order intake.
      const fileParts = attachments
        .filter((a) => VISION_MEDIA_TYPES.includes(a.mediaType))
        .map((a) => ({ type: "file" as const, mediaType: a.mediaType, url: a.url, filename: a.name }));
      void sendMessage({
        text: [trimmed, ...artworkLines].filter(Boolean).join("\n"),
        ...(fileParts.length > 0 ? { files: fileParts } : {}),
      });
      track("demo_prompt_submitted");
      setInput("");
      setAttachments([]);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    },
    [attachments, sendMessage],
  );

  const attachFiles = useCallback((files: FileList | null) => {
    const file = files?.[0];
    if (file === undefined) return;
    setUploading(true);
    setUploadError(undefined);
    // Two hops: exchange for a signed Supabase Storage URL, then upload the
    // file straight there (serverless bodies cap at ~4.5MB, print files don't).
    fetch("/api/artwork", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType: file.type }),
    })
      .then(async (response) => {
        const data = (await response.json()) as {
          ok?: boolean;
          uploadUrl?: string;
          publicUrl?: string;
        };
        const { uploadUrl, publicUrl } = data;
        if (!response.ok || data.ok !== true || uploadUrl === undefined || publicUrl === undefined) {
          throw new Error("token exchange failed");
        }
        const put = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "content-type": file.type },
          body: file,
        });
        if (!put.ok) throw new Error("upload failed");
        setAttachments((prev) => [...prev, { name: file.name, url: publicUrl, mediaType: file.type }]);
        track("artwork_attached");
      })
      .catch(() => {
        setUploadError("Upload failed — try a PNG, JPEG, TIFF, SVG, or PDF under 50MB");
      })
      .finally(() => { setUploading(false); });
  }, []);

  return (
    <div className="max-w-[44rem] mx-auto px-5 py-6 min-h-[420px] flex flex-col">
      <div className="flex-1 overflow-y-auto">
        {empty ? (
          <div className="py-8">
            <p className="text-[15px] leading-relaxed text-mid mb-6">
              Try one of these strategic prompts. The demo returns a structured, non-binding
              specification and quote.
            </p>
            <div className="flex flex-wrap gap-2">
              {demoPage.suggestedPrompts.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="font-mono text-[11px] border px-3 py-2 text-left hover:border-signal"
                  style={{ borderColor: t.line, color: t.midStrong }}
                  onClick={() => { send(suggestion); }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-4">
            {messages.map((message) => (
              <MessageParts key={message.id} message={message} />
            ))}
            {status === "submitted" ? (
              <div className="py-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] mb-2">Advertek</div>
                <span className="font-mono text-sm" style={{ color: t.mid }} aria-label="Thinking">
                  <span className="think-dot">·</span>
                  <span className="think-dot">·</span>
                  <span className="think-dot">·</span>
                </span>
              </div>
            ) : null}
            {error !== undefined ? (
              <div className="py-4">
                <div className="font-mono text-[11px] uppercase tracking-widest flex items-center gap-4" style={{ color: t.mid }}>
                  Something went wrong.
                  <button
                    type="button"
                    className="border px-3 py-1.5"
                    style={{ borderColor: t.text, color: t.text }}
                    onClick={() => {
                      clearError();
                      void regenerate();
                    }}
                  >
                    Try again
                  </button>
                </div>
                {error.message.trim().length > 0 ? (
                  <p className="text-[12px] leading-relaxed mt-2 break-words" style={{ color: t.mid }}>
                    {error.message}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="pt-4 mt-auto">
        {attachments.length > 0 || uploading || uploadError !== undefined ? (
          <div className="flex flex-wrap items-center gap-2 mb-2 font-mono text-[10px] uppercase tracking-wider">
            {attachments.map((attachment) => (
              <span
                key={attachment.url}
                className="inline-flex items-center gap-2 border px-2 py-1"
                style={{ borderColor: t.line, color: t.midStrong }}
              >
                {attachment.mediaType.startsWith("image/") ? (
                  <img
                    src={attachment.url}
                    alt=""
                    className="h-8 w-8 object-cover border"
                    style={{ borderColor: t.line }}
                  />
                ) : null}
                {attachment.name}
                <button
                  type="button"
                  aria-label={`Remove ${attachment.name}`}
                  onClick={() => { setAttachments((prev) => prev.filter((a) => a.url !== attachment.url)); }}
                >
                  ×
                </button>
              </span>
            ))}
            {uploading ? <span style={{ color: t.mid }}>Uploading…</span> : null}
            {uploadError !== undefined ? <span style={{ color: t.mid }}>{uploadError}</span> : null}
          </div>
        ) : null}
        <div
          className="relative"
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => { setDragging(false); }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            attachFiles(event.dataTransfer.files);
          }}
        >
          <CropMark className="absolute -top-[9px] -left-[9px]" stroke={t.mid} />
          <CropMark className="absolute -top-[9px] -right-[9px]" stroke={t.mid} />
          <CropMark className="absolute -bottom-[9px] -left-[9px]" stroke={t.mid} />
          <CropMark className="absolute -bottom-[9px] -right-[9px]" stroke={t.mid} />
          <div
            className="flex items-end gap-2 border px-3 py-2"
            style={{
              borderColor: dragging ? t.accent : t.text,
              backgroundColor: t.bg,
            }}
          >
            <button
              type="button"
              aria-label="Attach artwork"
              title="Attach artwork (PNG, JPEG, TIFF, SVG, PDF)"
              className="font-mono text-lg leading-none pb-1.5"
              style={{ color: t.mid }}
              onClick={() => fileInputRef.current?.click()}
            >
              +
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/tiff,image/svg+xml,application/pdf"
              className="hidden"
              onChange={(event) => {
                attachFiles(event.target.files);
                event.target.value = "";
              }}
            />
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              aria-label="Describe a production need"
              placeholder="Describe what you need produced…"
              className="flex-1 resize-none bg-transparent text-[15px] leading-relaxed py-1 outline-none max-h-40"
              style={{ color: t.text }}
              onChange={(event) => {
                setInput(event.target.value);
                event.target.style.height = "auto";
                event.target.style.height = `${String(Math.min(event.target.scrollHeight, 160))}px`;
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  if (!busy) send(input);
                }
              }}
            />
            <button
              type="button"
              aria-label="Send"
              disabled={busy || uploading}
              className="font-mono text-[11px] uppercase tracking-widest px-4 py-2 disabled:opacity-40"
              style={{ backgroundColor: t.accent, color: t.accentContrast }}
              onClick={() => { send(input); }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
