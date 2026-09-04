"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { accessRequestSchema, type AccessRequestInput } from "@/lib/access-schema";
import { productionCapabilities } from "@/lib/site-config";
import { track } from "@/lib/analytics";

type FieldErrors = Partial<Record<keyof AccessRequestInput, string | undefined>>;

const initial: AccessRequestInput = {
  firstName: "",
  lastName: "",
  email: "",
  company: "",
  role: "",
  website: "",
  useCase: "",
  categories: [],
  monthlyVolume: "",
  monthlySpend: "",
  geography: "",
  integration: "unsure",
  settlement: "unsure",
  pilotDate: "",
  workflow: "",
  consent: false,
  websiteHp: "",
};

const useCaseOptions = [
  "Agency / creative operations",
  "AI agent / workflow platform",
  "Multi-location brand",
  "Direct-mail / lifecycle marketing",
  "Commerce / procurement platform",
  "Other",
];

export function AccessForm({ successText }: { readonly successText: string }) {
  const pathname = usePathname();
  const [form, setForm] = useState<AccessRequestInput>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverMessage, setServerMessage] = useState<string | undefined>(undefined);

  const setField = <K extends keyof AccessRequestInput>(key: K, value: AccessRequestInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const toggleCategory = (id: string) => {
    setForm((prev) => {
      const next = prev.categories.includes(id)
        ? prev.categories.filter((c) => c !== id)
        : [...prev.categories, id];
      return { ...prev, categories: next };
    });
    if (errors.categories) {
      setErrors((prev) => ({ ...prev, categories: undefined }));
    }
  };

  const validate = (): FieldErrors => {
    const parsed = accessRequestSchema.safeParse(form);
    if (parsed.success) return {};
    const next: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof AccessRequestInput;
      if (!next[key]) next[key] = issue.message;
    }
    return next;
  };

  const handleSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    track("access_form_started");
    const validation = validate();
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      const firstError = document.querySelector<HTMLElement>("[aria-invalid='true']");
      firstError?.focus();
      return;
    }

    setSubmitting(true);
    setServerMessage(undefined);
    try {
      const response = await fetch("/api/access-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; message?: string };
      if (response.ok && data.ok) {
        setSuccess(true);
        track("enterprise_access_submitted", { source: pathname, categoryCount: form.categories.length });
      } else {
        setServerMessage(data.error ?? data.message ?? "Submission failed. Please try again.");
        track("access_form_failed", { errorCategory: String(data.error) });
      }
    } catch {
      setServerMessage("Network error. Please try again.");
      track("access_form_failed", { errorCategory: "network" });
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="border border-ink/10 p-8 text-center" role="status" aria-live="polite">
        <p className="font-display text-xl font-medium mb-3">Thank you</p>
        <p className="text-[15px] leading-relaxed text-ink/80">{successText}</p>
      </div>
    );
  }

  const inputClass = (key: keyof AccessRequestInput) =>
    `w-full border px-3 py-2.5 text-[15px] bg-paper focus:outline focus:outline-1 focus:outline-offset-0 ${
      errors[key] ? "border-signal" : "border-ink/10"
    }`;

  return (
    <form onSubmit={(e) => { void handleSubmit(e); }} className="grid gap-6" noValidate>
      {serverMessage ? (
        <div className="border border-signal/30 bg-signal/5 p-4 text-[14px]" role="alert">
          {serverMessage}
        </div>
      ) : null}

      <div className="hidden" aria-hidden="true">
        <input
          type="text"
          name="websiteHp"
          value={form.websiteHp}
          onChange={(e) => { setField("websiteHp", e.target.value); }}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-mid" htmlFor="firstName">
            First name
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            value={form.firstName}
            onChange={(e) => { setField("firstName", e.target.value); }}
            className={inputClass("firstName")}
            aria-invalid={!!errors.firstName}
            aria-describedby={errors.firstName ? "firstName-error" : undefined}
            required
          />
          {errors.firstName ? <p id="firstName-error" className="text-signal text-[12px] mt-1">{errors.firstName}</p> : null}
        </div>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-mid" htmlFor="lastName">
            Last name
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            value={form.lastName}
            onChange={(e) => { setField("lastName", e.target.value); }}
            className={inputClass("lastName")}
            aria-invalid={!!errors.lastName}
            aria-describedby={errors.lastName ? "lastName-error" : undefined}
            required
          />
          {errors.lastName ? <p id="lastName-error" className="text-signal text-[12px] mt-1">{errors.lastName}</p> : null}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-mid" htmlFor="email">
            Work email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={(e) => { setField("email", e.target.value); }}
            className={inputClass("email")}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            required
          />
          {errors.email ? <p id="email-error" className="text-signal text-[12px] mt-1">{errors.email}</p> : null}
        </div>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-mid" htmlFor="company">
            Company
          </label>
          <input
            id="company"
            name="company"
            type="text"
            value={form.company}
            onChange={(e) => { setField("company", e.target.value); }}
            className={inputClass("company")}
            aria-invalid={!!errors.company}
            aria-describedby={errors.company ? "company-error" : undefined}
            required
          />
          {errors.company ? <p id="company-error" className="text-signal text-[12px] mt-1">{errors.company}</p> : null}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-mid" htmlFor="role">
            Role
          </label>
          <input
            id="role"
            name="role"
            type="text"
            value={form.role}
            onChange={(e) => { setField("role", e.target.value); }}
            className={inputClass("role")}
            aria-invalid={!!errors.role}
            aria-describedby={errors.role ? "role-error" : undefined}
            required
          />
          {errors.role ? <p id="role-error" className="text-signal text-[12px] mt-1">{errors.role}</p> : null}
        </div>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-mid" htmlFor="website">
            Company website
          </label>
          <input
            id="website"
            name="website"
            type="url"
            value={form.website}
            onChange={(e) => { setField("website", e.target.value); }}
            className={inputClass("website")}
          />
        </div>
      </div>

      <div>
        <label className="font-mono text-[10px] uppercase tracking-widest text-mid" htmlFor="useCase">
          Primary use case
        </label>
        <select
          id="useCase"
          name="useCase"
          value={form.useCase}
          onChange={(e) => { setField("useCase", e.target.value); }}
          className={inputClass("useCase")}
          aria-invalid={!!errors.useCase}
          aria-describedby={errors.useCase ? "useCase-error" : undefined}
          required
        >
          <option value="">Select one</option>
          {useCaseOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {errors.useCase ? <p id="useCase-error" className="text-signal text-[12px] mt-1">{errors.useCase}</p> : null}
      </div>

      <fieldset aria-invalid={!!errors.categories}>
        <legend className="font-mono text-[10px] uppercase tracking-widest text-mid mb-3">
          Production categories
        </legend>
        <div className="grid gap-2 md:grid-cols-2">
          {productionCapabilities.map((cap) => (
            <label key={cap.id} className="flex items-center gap-2 text-[14px]">
              <input
                type="checkbox"
                name="categories"
                value={cap.id}
                checked={form.categories.includes(cap.id)}
                onChange={() => { toggleCategory(cap.id); }}
                className="accent-signal"
              />
              {cap.label}
            </label>
          ))}
        </div>
        {errors.categories ? <p className="text-signal text-[12px] mt-2">{errors.categories}</p> : null}
      </fieldset>

      <div className="grid gap-6 md:grid-cols-3">
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-mid" htmlFor="monthlyVolume">
            Est. monthly order volume
          </label>
          <input
            id="monthlyVolume"
            name="monthlyVolume"
            type="text"
            value={form.monthlyVolume}
            onChange={(e) => { setField("monthlyVolume", e.target.value); }}
            className={inputClass("monthlyVolume")}
            placeholder="e.g., 50–100 orders"
          />
        </div>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-mid" htmlFor="monthlySpend">
            Est. monthly production spend
          </label>
          <input
            id="monthlySpend"
            name="monthlySpend"
            type="text"
            value={form.monthlySpend}
            onChange={(e) => { setField("monthlySpend", e.target.value); }}
            className={inputClass("monthlySpend")}
            placeholder="e.g., $5,000 CAD"
          />
        </div>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-mid" htmlFor="geography">
            Target geography
          </label>
          <input
            id="geography"
            name="geography"
            type="text"
            value={form.geography}
            onChange={(e) => { setField("geography", e.target.value); }}
            className={inputClass("geography")}
            aria-invalid={!!errors.geography}
            aria-describedby={errors.geography ? "geography-error" : undefined}
            required
          />
          {errors.geography ? <p id="geography-error" className="text-signal text-[12px] mt-1">{errors.geography}</p> : null}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-mid" htmlFor="integration">
            Preferred integration
          </label>
          <select
            id="integration"
            name="integration"
            value={form.integration}
            onChange={(e) => { setField("integration", e.target.value as AccessRequestInput["integration"]); }}
            className={inputClass("integration")}
          >
            <option value="MCP">MCP</option>
            <option value="REST">REST</option>
            <option value="both">Both</option>
            <option value="unsure">Unsure</option>
          </select>
        </div>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-mid" htmlFor="settlement">
            Preferred settlement
          </label>
          <select
            id="settlement"
            name="settlement"
            value={form.settlement}
            onChange={(e) => { setField("settlement", e.target.value as AccessRequestInput["settlement"]); }}
            className={inputClass("settlement")}
          >
            <option value="invoice">Invoice</option>
            <option value="card">Card</option>
            <option value="bank">Bank transfer</option>
            <option value="USDC">USDC</option>
            <option value="unsure">Unsure</option>
          </select>
        </div>
      </div>

      <div>
        <label className="font-mono text-[10px] uppercase tracking-widest text-mid" htmlFor="pilotDate">
          Target pilot date
        </label>
        <input
          id="pilotDate"
          name="pilotDate"
          type="date"
          value={form.pilotDate}
          onChange={(e) => { setField("pilotDate", e.target.value); }}
          className={inputClass("pilotDate")}
        />
      </div>

      <div>
        <label className="font-mono text-[10px] uppercase tracking-widest text-mid" htmlFor="workflow">
          Workflow description
        </label>
        <textarea
          id="workflow"
          name="workflow"
          rows={4}
          value={form.workflow}
          onChange={(e) => { setField("workflow", e.target.value); }}
          className={inputClass("workflow")}
          aria-invalid={!!errors.workflow}
          aria-describedby={errors.workflow ? "workflow-error" : undefined}
          required
        />
        {errors.workflow ? <p id="workflow-error" className="text-signal text-[12px] mt-1">{errors.workflow}</p> : null}
      </div>

      <label className="flex items-start gap-3 text-[14px] leading-relaxed">
        <input
          type="checkbox"
          name="consent"
          checked={form.consent}
          onChange={(e) => { setField("consent", e.target.checked); }}
          className="accent-signal mt-1"
          aria-invalid={!!errors.consent}
          aria-describedby={errors.consent ? "consent-error" : undefined}
          required
        />
        <span>
          I agree to Advertek processing the information above to assess pilot fit and respond to this request.
        </span>
      </label>
      {errors.consent ? <p id="consent-error" className="text-signal text-[12px]">{errors.consent}</p> : null}

      <div>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest bg-signal text-signal-contrast px-6 py-3 hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Request Pilot Access"}
        </button>
      </div>
    </form>
  );
}
