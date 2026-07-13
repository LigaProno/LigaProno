"use client";

import { useState } from "react";
import { AuthAlert, AuthCard, AuthField, AuthPrimaryButton } from "@/components/auth/auth-ui";

type VerificationStepProps = {
  email: string;
  code: string;
  onCodeChange: (code: string) => void;
  onVerify: (e: React.FormEvent) => Promise<void>;
  onResend: () => Promise<void>;
  onBack: () => void;
  loading: boolean;
  codeError?: string;
  globalError?: string;
};

export function VerificationStep({
  email,
  code,
  onCodeChange,
  onVerify,
  onResend,
  onBack,
  loading,
  codeError,
  globalError,
}: VerificationStepProps) {
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    setResending(true);
    try {
      await onResend();
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthCard title="Verifică emailul">
      <p className="mb-5 text-center text-sm leading-relaxed text-white/55">
        Am trimis un cod de verificare la{" "}
        <span className="font-medium text-white/80">{email}</span>
      </p>

      {globalError ? <div className="mb-4"><AuthAlert message={globalError} /></div> : null}

      <form onSubmit={onVerify} className="space-y-4">
        <AuthField
          id="code"
          label="Cod de verificare"
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          placeholder="Introdu codul din email"
          autoComplete="one-time-code"
          inputMode="numeric"
          error={codeError}
        />

        <AuthPrimaryButton loading={loading}>Verifică contul</AuthPrimaryButton>
      </form>

      <div className="mt-4 flex flex-col items-center gap-2 text-sm">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || loading}
          className="font-medium text-[#D4AF37] transition-colors hover:text-[#E8C878] disabled:opacity-50"
        >
          {resending ? "Se retrimite..." : "Retrimite codul"}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="text-white/45 transition-colors hover:text-white/70"
        >
          Înapoi
        </button>
      </div>
    </AuthCard>
  );
}
