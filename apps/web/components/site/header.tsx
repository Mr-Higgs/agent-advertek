"use client";

import { useState, useId } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { mainNav, routes } from "@/lib/site-config";
import { track } from "@/lib/analytics";

export function GlobalHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() || "";
  const menuId = useId();

  return (
    <header className="sticky top-0 z-50 bg-paper/95 backdrop-blur border-b border-ink/10">
      <div className="max-w-[82rem] mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          href={routes.home}
          className="flex items-center gap-2.5 focus-visible:outline-offset-4"
          onClick={() => { track("nav_cta_clicked", { page: pathname, source: "header-wordmark" }); }}
        >
          <img
            src="/logo/advertek-agent-lockup.png"
            alt="Advertek Agent"
            width={81}
            height={48}
            className="h-12 w-auto"
          />
        </Link>

        <nav aria-label="Primary" className="hidden md:flex items-center gap-8">
          {mainNav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link font-mono text-[11px] uppercase tracking-widest py-1 ${
                  active ? "text-ink" : "text-mid"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:block">
          <Link
            href={routes.access}
            className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest bg-signal text-signal-contrast px-4 py-2.5 hover:opacity-90 focus-visible:outline-offset-4"
            onClick={() => { track("nav_cta_clicked", { page: pathname, source: "header-request-access" }); }}
          >
            Request Access
          </Link>
        </div>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls={menuId}
          className="md:hidden p-2 -mr-2 focus-visible:outline-offset-2"
          onClick={() => { setOpen((v) => !v); }}
        >
          {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </div>

      {open ? (
        <div id={menuId} className="md:hidden border-t border-ink/10 bg-paper">
          <nav aria-label="Mobile" className="max-w-[82rem] mx-auto px-6 py-4 flex flex-col gap-4">
            {mainNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="font-mono text-[12px] uppercase tracking-widest py-2"
                onClick={() => { setOpen(false); }}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={routes.access}
              className="inline-flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-widest bg-signal text-signal-contrast px-4 py-3 mt-2"
              onClick={() => {
                setOpen(false);
                track("nav_cta_clicked", { page: pathname, source: "mobile-request-access" });
              }}
            >
              Request Access
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
