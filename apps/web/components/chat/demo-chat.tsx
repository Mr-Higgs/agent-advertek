"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { upload } from "@vercel/blob/client";
import { themes } from "@/components/theme";
import { CropMark } from "@/components/icons";
import { MessageParts } from "./message-parts";
import { demoPage } from "@/lib/site-config";
import { track } from "@/lib/analytics";

const t = themes.light;
const STORAGE_KEY = "advertek-demo-chat-v1";

interface Attachment {
  readonly name: string;
  readonly url: string;
}

function readStoredMessages(): UIMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    return JSON.parse(raw) as UIMessage[];
  } catch {
    return [];
  }
}

export function DemoChat() {
  const { messages, sendMessage, setMessages, status, error, regenerate, clearError } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<readonly Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | undefined>(undefined);
  const [dragging, setDragging] = useState(false);
  const restored = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const stored = readStoredMessages();
    if (stored.length > 0) setMessages(stored);
  }, [setMessages]);

  useEffect(() => {
    if (!restored.current) return;
    try {
      if (messages.length === 0) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      }
    } catch {
      // Storage may be unavailable.
    }
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, status]);

  const busy = status === "submitted" || status === "streaming";
  const empty = messages.length === 0;

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      const artworkLines = attachments.map((a) => `Artwork: ${a.url}`);
      if (trimmed.length === 0 && artworkLines.length === 0) return;
      void sendMessage({ text: [trimmed, ...artworkLines].filter(Boolean).join("\n") });
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
    upload(`artwork/${file.name}`, file, { access: "public", handleUploadUrl: "/api/artwork" })
      .then((blob) => {
        setAttachments((prev) => [...prev, { name: file.name, url: blob.url }]);
        track("artwork_attached");
      })
      .catch(() => {
        setUploadError("Upload failed — try a PNG, JPEG, TIFF, SVG, or PDF under 100MB");
      })
      .finally(() => { setUploading(false); });
  }, []);

  return (
    <div className="border border-ink/10" style={{ backgroundColor: t.bg, color: t.text }}>
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
                <div className="py-4 font-mono text-[11px] uppercase tracking-widest flex items-center gap-4" style={{ color: t.mid }}>
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
    </div>
  );
}
