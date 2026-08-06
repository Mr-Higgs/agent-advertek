"use client";

import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { z } from "zod";
import { ACCENT, type Theme } from "./theme";

const monthlyVolumeSchema = z.enum(["<100", "100-1000", "1000-10000", "10000+"]);
type MonthlyVolume = z.infer<typeof monthlyVolumeSchema>;

const MONTHLY_VOLUME_OPTIONS: ReadonlyArray<{ readonly value: MonthlyVolume; readonly label: string }> = [
  { value: "<100", label: "Under 100 / month" },
  { value: "100-1000", label: "100–1,000 / month" },
  { value: "1000-10000", label: "1,000–10,000 / month" },
  { value: "10000+", label: "10,000+ / month" },
];

const railAccessRequestSchema = z.object({
  name: z.string().trim().min(1, "Enter your name"),
  email: z.string().trim().min(1, "Enter your work email").email("Enter a valid email"),
  company: z.string().trim().min(1, "Enter your company or project name"),
  useCase: z
    .string()
    .trim()
    .min(20, "Give us a bit more detail (20+ characters) about what your agent needs to print"),
  monthlyVolume: monthlyVolumeSchema.optional(),
});

type RailAccessRequest = z.infer<typeof railAccessRequestSchema>;
type FieldErrors = Partial<Record<keyof RailAccessRequest, string>>;

const EMPTY_FORM: Record<keyof RailAccessRequest, string> = {
  name: "",
  email: "",
  company: "",
  useCase: "",
  monthlyVolume: "",
};

/**
 * Submits a validated rail-access request. Posts JSON to
 * `NEXT_PUBLIC_RAIL_ACCESS_ENDPOINT` when configured; otherwise falls back to
 * opening a prefilled mailto: link so a submission is never silently
 * dropped just because no backend intake endpoint exists yet.
 *
 * TODO: confirm the real intake inbox before launch — `rail@advertekprinting.com`
 * below is a placeholder.
 */
async function submitRailAccessRequest(data: RailAccessRequest): Promise<"sent" | "mailto"> {
  const endpoint = process.env.NEXT_PUBLIC_RAIL_ACCESS_ENDPOINT;

  if (endpoint) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Request failed with status ${String(response.status)}`);
    }
    return "sent";
  }

  const volumeLabel =
    MONTHLY_VOLUME_OPTIONS.find((option) => option.value === data.monthlyVolume)?.label ??
    "not specified";
  const subject = `Rail access request — ${data.company}`;
  const body = [
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Company: ${data.company}`,
    `Estimated monthly volume: ${volumeLabel}`,
    "",
    "What they're building:",
    data.useCase,
  ].join("\n");

  window.location.href = `mailto:rail@advertekprinting.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return "mailto";
}

interface RailAccessFormProps {
  readonly theme: Theme;
  readonly onClose: () => void;
}

type SubmitState =
  | { readonly status: "idle" }
  | { readonly status: "submitting" }
  | { readonly status: "success"; readonly via: "sent" | "mailto" }
  | { readonly status: "error"; readonly message: string };

export function RailAccessForm({ theme: t, onClose }: RailAccessFormProps) {
  const [values, setValues] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const headingId = useId();

  useEffect(() => {
    firstFieldRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  function updateField(field: keyof RailAccessRequest, value: string): void {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const candidate = {
      name: values.name,
      email: values.email,
      company: values.company,
      useCase: values.useCase,
      ...(values.monthlyVolume ? { monthlyVolume: values.monthlyVolume } : {}),
    };
    const parsed = railAccessRequestSchema.safeParse(candidate);

    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && !(field in nextErrors)) {
          nextErrors[field as keyof RailAccessRequest] = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    setSubmitState({ status: "submitting" });
    try {
      const via = await submitRailAccessRequest(parsed.data);
      setSubmitState({ status: "success", via });
    } catch (error) {
      setSubmitState({
        status: "error",
        message: error instanceof Error ? error.message : "Something went wrong. Please try again.",
      });
    }
  }

  const inputStyle: React.CSSProperties = {
    backgroundColor: "transparent",
    border: `1px solid ${t.line}`,
    color: t.text,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto p-4 sm:p-6"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="w-full max-w-lg my-8 sm:my-0 p-6 sm:p-8 relative"
        style={{ backgroundColor: t.bg, border: `1px solid ${t.line}`, color: t.text }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 flex items-center justify-center w-8 h-8"
          style={{ border: `1px solid ${t.line}`, color: t.text }}
        >
          <X size={14} />
        </button>

        <div className="font-mono text-xs tracking-widest uppercase mb-2" style={{ color: t.mid }}>
          Agent Fulfillment Rail
        </div>
        <h2 id={headingId} className="font-display uppercase mb-6" style={{ fontWeight: 700, fontSize: "1.75rem" }}>
          Request Rail Access
        </h2>

        {submitState.status === "success" ? (
          <div>
            <p className="text-sm leading-relaxed mb-8" style={{ color: t.mid }}>
              {submitState.via === "sent"
                ? "Thanks — your request is in. We'll follow up at the email you provided."
                : "Your email client should have opened with your request prefilled. Send it and we'll follow up shortly."}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="font-mono text-xs tracking-widest uppercase px-6 py-3"
              style={{ backgroundColor: ACCENT, color: "#FFFFFF" }}
            >
              Close
            </button>
          </div>
        ) : (
          <form
            onSubmit={(event) => {
              void handleSubmit(event);
            }}
            noValidate
          >
            <div className="grid grid-cols-1 gap-5">
              <Field label="Name" htmlFor="rail-access-name" error={fieldErrors.name}>
                <input
                  ref={firstFieldRef}
                  id="rail-access-name"
                  type="text"
                  autoComplete="name"
                  value={values.name}
                  onChange={(event) => {
                    updateField("name", event.target.value);
                  }}
                  className="w-full px-3 py-2 text-sm font-mono"
                  style={inputStyle}
                />
              </Field>

              <Field label="Work email" htmlFor="rail-access-email" error={fieldErrors.email}>
                <input
                  id="rail-access-email"
                  type="email"
                  autoComplete="email"
                  value={values.email}
                  onChange={(event) => {
                    updateField("email", event.target.value);
                  }}
                  className="w-full px-3 py-2 text-sm font-mono"
                  style={inputStyle}
                />
              </Field>

              <Field label="Company / project" htmlFor="rail-access-company" error={fieldErrors.company}>
                <input
                  id="rail-access-company"
                  type="text"
                  autoComplete="organization"
                  value={values.company}
                  onChange={(event) => {
                    updateField("company", event.target.value);
                  }}
                  className="w-full px-3 py-2 text-sm font-mono"
                  style={inputStyle}
                />
              </Field>

              <Field label="Estimated monthly volume (optional)" htmlFor="rail-access-volume">
                <select
                  id="rail-access-volume"
                  value={values.monthlyVolume}
                  onChange={(event) => {
                    updateField("monthlyVolume", event.target.value);
                  }}
                  className="w-full px-3 py-2 text-sm font-mono"
                  style={inputStyle}
                >
                  <option value="">Select a range</option>
                  {MONTHLY_VOLUME_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="What does your agent need to print?" htmlFor="rail-access-usecase" error={fieldErrors.useCase}>
                <textarea
                  id="rail-access-usecase"
                  rows={4}
                  value={values.useCase}
                  onChange={(event) => {
                    updateField("useCase", event.target.value);
                  }}
                  className="w-full px-3 py-2 text-sm font-mono resize-none"
                  style={inputStyle}
                />
              </Field>
            </div>

            {submitState.status === "error" && (
              <p className="text-sm mt-5" style={{ color: ACCENT }}>
                {submitState.message}
              </p>
            )}

            <div className="flex items-center gap-4 mt-8">
              <button
                type="submit"
                disabled={submitState.status === "submitting"}
                className="font-mono text-xs tracking-widest uppercase px-6 py-3 disabled:opacity-50"
                style={{ backgroundColor: ACCENT, color: "#FFFFFF" }}
              >
                {submitState.status === "submitting" ? "Sending…" : "Send Request"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="font-mono text-xs tracking-widest uppercase px-6 py-3"
                style={{ border: `1px solid ${t.line}`, color: t.text }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

interface FieldProps {
  readonly label: string;
  readonly htmlFor: string;
  readonly error?: string | undefined;
  readonly children: React.ReactNode;
}

function Field({ label, htmlFor, error, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block font-mono text-xs tracking-widest uppercase mb-2">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-xs mt-1.5" style={{ color: ACCENT }}>
          {error}
        </p>
      )}
    </div>
  );
}
