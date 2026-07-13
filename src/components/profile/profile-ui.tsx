"use client";

import type { ReactNode } from "react";

export function ProfileSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="app-panel">
      <div className="app-panel-accent" aria-hidden />
      <header className="mb-5">
        <h2 className="text-base font-bold tracking-tight text-white">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-white/45">{description}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

export function ProfileField({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-medium uppercase tracking-wide text-white/40">{label}</span>
      {children ?? <p className="text-sm text-white/90">{value}</p>}
    </div>
  );
}

export function ProfileButton({
  variant = "primary",
  loading,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
  loading?: boolean;
}) {
  const className =
    variant === "primary" ? "app-btn-primary"
    : variant === "danger" ? "app-btn-danger"
    : "app-btn-ghost";

  return (
    <button type="button" className={className} disabled={loading || props.disabled} {...props}>
      {loading ? "Se procesează…" : children}
    </button>
  );
}

export function ProfileInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="auth-input w-full" {...props} />;
}

export function ProfileAlert({ message, tone = "error" }: { message: string; tone?: "error" | "success" }) {
  return (
    <p
      className={`rounded-lg px-3 py-2 text-sm ${
        tone === "success" ?
          "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
        : "border border-red-500/30 bg-red-500/10 text-red-300"
      }`}
    >
      {message}
    </p>
  );
}
