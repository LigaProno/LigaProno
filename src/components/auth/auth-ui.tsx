"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, type InputHTMLAttributes, type ReactNode } from "react";

export function AuthCard({
  title,
  children,
  footer,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="auth-card w-full max-w-[420px]">
      <div className="auth-card-accent" aria-hidden />
      <h2 className="mb-6 text-center text-lg font-bold tracking-tight text-white">{title}</h2>
      {children}
      {footer ? <div className="mt-6 border-t border-[rgba(197,160,89,0.14)] pt-5">{footer}</div> : null}
    </div>
  );
}

export function AuthField({
  id,
  label,
  error,
  ...inputProps
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = inputProps.type === "password";

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-white/90">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          className="auth-input w-full"
          {...inputProps}
          type={isPassword && showPassword ? "text" : inputProps.type}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C5A059]/80 transition-colors hover:text-[#D4AF37]"
            aria-label={showPassword ? "Ascunde parola" : "Arată parola"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}

export function AuthPrimaryButton({
  children,
  loading,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button type="submit" className="auth-btn-primary w-full" disabled={loading || props.disabled} {...props}>
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Se procesează...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function AuthOAuthButton({
  onClick,
  loading,
  label,
}: {
  onClick: () => void;
  loading?: boolean;
  label: string;
}) {
  return (
    <button type="button" onClick={onClick} disabled={loading} className="auth-btn-oauth w-full">
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-[#C5A059]" />
      ) : (
        <GoogleIcon />
      )}
      <span>{label}</span>
    </button>
  );
}

export function AuthDivider() {
  return (
    <div className="my-5 flex items-center gap-3">
      <div className="h-px flex-1 bg-[rgba(197,160,89,0.18)]" />
      <span className="text-xs font-medium uppercase tracking-wider text-white/40">sau</span>
      <div className="h-px flex-1 bg-[rgba(197,160,89,0.18)]" />
    </div>
  );
}

export function AuthAlert({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
      {message}
    </div>
  );
}

export function AuthFooterLink({
  text,
  linkText,
  href,
}: {
  text: string;
  linkText: string;
  href: string;
}) {
  return (
    <p className="text-center text-sm text-white/55">
      {text}{" "}
      <Link href={href} className="font-semibold text-[#D4AF37] transition-colors hover:text-[#E8C878]">
        {linkText}
      </Link>
    </p>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 shrink-0">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
