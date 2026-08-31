"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { upload } from "@vercel/blob/client";
import { themes } from "../theme";
import { AdvertekMark, CropMark, RegMark } from "../icons";
import { MessageParts } from "./message-parts";

const t = themes.light;

const STORAGE_KEY = "advertek-chat-v1";

const SUGGESTIONS = [
  "What can I print?",
  "Show me canvas prints",
  "Quote 500 A5 flyers, matte, standard turnaround",
  "How does paying in USDC work?",
];

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

export default function PrintShopChat() {
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
    if (stored.length > 0) {
      setMessages(stored);
    }
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
      // Storage may be unavailable (private mode); the chat still works.
    }
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, status]);

  const busy = status === "submitted" || status === "streaming";

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      const artworkLines = attachments.map((a) => `Artwork: ${a.url}`);
      if (trimmed.length === 0 && artworkLines.length === 0) return;
      void sendMessage({ text: [trimmed, ...artworkLines].filter(Boolean).join("\n") });
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
      })
      .catch(() => {
        setUploadError("Upload failed — try a PNG, JPEG, TIFF, SVG, or PDF under 100MB");
      })
      .finally(() => {
        setUploading(false);
      });
  }, []);

  const newChat = useCallback(() => {
    setMessages([]);
    setInput("");
    setAttachments([]);
    setUploadError(undefined);
    clearError();
  }, [setMessages, clearError]);

  const empty = messages.length === 0;

  return (
    <div className="flex h-dvh" style={{ backgroundColor: t.bg, color: t.text }}>
      {/* Sidebar */}
      <aside
        className="hidden md:flex w-64 shrink-0 flex-col border-r px-6 py-6"
        style={{ borderColor: t.line }}
      >
        <a href="/" className="flex items-center gap-3 mb-8">
          <AdvertekMark size={26} />
          <span className="font-display font-black tracking-[0.08em] text-sm">ADVERTEK</span>
        </a>
        <button
          type="button"
          onClick={newChat}
          className="font-mono text-[11px] uppercase tracking-widest px-4 py-2.5 mb-8 text-left"
          style={{ backgroundColor: t.accent, color: t.accentContrast }}
        >
          + New chat
        </button>
        <nav className="flex flex-col gap-4 font-mono text-[11px] uppercase tracking-widest">
          <button
            type="button"
            className="nav-link text-left w-fit"
            style={{ color: t.midStrong }}
            onClick={() => {
              void sendMessage({ text: "What can I print?" });
            }}
          >
            Catalog
          </button>
          <a href="/rail" className="nav-link w-fit" style={{ color: t.midStrong }}>
            For developers
          </a>
          <a href="/whitepaper" className="nav-link w-fit" style={{ color: t.midStrong }}>
            Whitepaper
          </a>
          <a
            href="https://advertekprinting.com"
            target="_blank"
            rel="noreferrer"
            className="nav-link w-fit"
            style={{ color: t.midStrong }}
          >
            Advertek Printing ↗
          </a>
        </nav>
        <div className="mt-auto pt-8 font-mono text-[10px] uppercase tracking-wider leading-relaxed" style={{ color: t.mid }}>
          Priced in CAD
          <br />
          Settled in USDC on Solana
          <br />
          North York, ON
        </div>
      </aside>

      {/* Main column */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header
          className="md:hidden flex items-center justify-between border-b px-4 py-3"
          style={{ borderColor: t.line }}
        >
          <a href="/" className="flex items-center gap-2">
            <AdvertekMark size={22} />
            <span className="font-display font-black tracking-[0.08em] text-xs">ADVERTEK</span>
          </a>
          <button
            type="button"
            onClick={newChat}
            className="font-mono text-[10px] uppercase tracking-widest border px-3 py-1.5"
            style={{ borderColor: t.text }}
          >
            New chat
          </button>
        </header>

        {/* Transcript */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[44rem] mx-auto px-5">
            {empty ? (
              <div className="flex flex-col justify-center min-h-full pt-[16vh] pb-10">
                <RegMark />
                <h1 className="font-serif text-[clamp(2.6rem,6vw,4.2rem)] leading-[1.05] mt-6 mb-5">
                  A print shop
                  <br />
                  <em>you can talk to.</em>
                </h1>
                <p className="text-[15px] leading-relaxed max-w-md mb-8" style={{ color: t.midStrong }}>
                  Advertek is a commercial print floor with an agent at the counter. Ask for
                  canvas, flyers, mugs, packaging — anything. It quotes in CAD, takes your
                  artwork, and settles in USDC on Solana.
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="font-mono text-[11px] border px-3 py-2 text-left"
                      style={{ borderColor: t.line, color: t.midStrong }}
                      onClick={() => {
                        void sendMessage({ text: suggestion });
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-6">
                {messages.map((message) => (
                  <MessageParts key={message.id} message={message} />
                ))}
                {status === "submitted" ? (
                  <div className="py-5">
                    <div
                      className="font-mono text-[10px] uppercase tracking-[0.25em] mb-2"
                      style={{ color: t.text }}
                    >
                      Advertek
                    </div>
                    <span className="font-mono text-sm" style={{ color: t.mid }} aria-label="Thinking">
                      <span className="think-dot">·</span>
                      <span className="think-dot">·</span>
                      <span className="think-dot">·</span>
                    </span>
                  </div>
                ) : null}
                {error !== undefined ? (
                  <div className="py-4 font-mono text-[11px] uppercase tracking-widest flex items-center gap-4" style={{ color: t.mid }}>
                    The press jammed — nothing was lost
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
        </div>

        {/* Composer */}
        <div className="px-5 pb-6 pt-2">
          <div className="max-w-[44rem] mx-auto">
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
                      onClick={() => {
                        setAttachments((prev) => prev.filter((a) => a.url !== attachment.url));
                      }}
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
              onDragLeave={() => {
                setDragging(false);
              }}
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
                  onClick={() => {
                    fileInputRef.current?.click();
                  }}
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
                  aria-label="Message the print shop"
                  placeholder={empty ? "Tell the shop what to print…" : "Reply…"}
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
                  onClick={() => {
                    send(input);
                  }}
                >
                  Send
                </button>
              </div>
            </div>
            <p
              className="font-mono text-[10px] uppercase tracking-wider mt-3 text-center"
              style={{ color: t.mid }}
            >
              Drop artwork anywhere on the box · quotes come from the shop, never the model
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
