"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { track } from "@/lib/analytics";

interface CodeExampleProps {
  readonly title: string;
  readonly language: string;
  readonly code: string;
}

export function CodeExample({ title, language, code }: CodeExampleProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      track("code_copied", { language, example: title });
      setTimeout(() => { setCopied(false); }, 2000);
    } catch {
      // Ignore copy failures.
    }
  };

  return (
    <figure className="border border-ink/10 bg-ink/[0.02]">
      <figcaption className="flex items-center justify-between px-4 py-2 border-b border-ink/10">
        <span className="font-mono text-[10px] uppercase tracking-widest text-mid">{title}</span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-mid">{language}</span>
      </figcaption>
      <div className="relative group">
        <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed font-mono">
          <code>{code}</code>
        </pre>
        <button
          type="button"
          onClick={() => { void handleCopy(); }}
          aria-label={`Copy ${title}`}
          className="absolute top-2 right-2 p-2 border border-ink/10 bg-paper hover:border-signal focus-visible:outline-offset-2"
        >
          {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
        </button>
      </div>
    </figure>
  );
}
