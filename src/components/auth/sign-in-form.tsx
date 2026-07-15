"use client";

import { useClerk, useSignIn } from "@clerk/nextjs";
import type { SignInSecondFactor } from "@clerk/shared/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import {
  AuthAlert,
  AuthCard,
  AuthDivider,
  AuthField,
  AuthFooterLink,
  AuthOAuthButton,
  AuthPrimaryButton,
} from "@/components/auth/auth-ui";
import { VerificationStep } from "@/components/auth/verification-step";
import { finalizeAuth } from "@/lib/auth-navigation";
import { getClerkErrorMessage, getHookGlobalError } from "@/lib/clerk-errors";
import { useLocale } from "@/components/i18n/locale-provider";

type MfaMode = "client_trust" | "email_code" | "phone_code" | "totp" | "backup_code";

function pickSecondFactor(
  factors: SignInSecondFactor[],
  status: "needs_second_factor" | "needs_client_trust",
): MfaMode | null {
  const hasTotp = factors.some((f) => f.strategy === "totp");
  const hasBackup = factors.some((f) => f.strategy === "backup_code");
  const hasEmail = factors.some(
    (f) => f.strategy === "email_code" || f.strategy === "email_link",
  );
  const hasPhone = factors.some((f) => f.strategy === "phone_code");

  // Client Trust (legacy: uneori returnează needs_second_factor + email_code)
  if (
    (status === "needs_client_trust" || status === "needs_second_factor") &&
    hasEmail &&
    !hasTotp &&
    !hasBackup &&
    !hasPhone
  ) {
    return "client_trust";
  }

  if (hasEmail) return "email_code";
  if (hasPhone) return "phone_code";
  if (hasTotp) return "totp";
  if (hasBackup) return "backup_code";
  return null;
}

const MFA_COPY: Record<
  MfaMode,
  {
    title: string;
    description: string;
    codeLabel: string;
    codePlaceholder: string;
    submitLabel: string;
    canResend: boolean;
  }
> = {
  client_trust: {
    title: "Verifică dispozitivul",
    description: "",
    codeLabel: "Cod din email",
    codePlaceholder: "Introdu codul primit",
    submitLabel: "Continuă",
    canResend: true,
  },
  email_code: {
    title: "Autentificare în doi pași",
    description: "Am trimis un cod la adresa ta de email. Introdu codul pentru a continua.",
    codeLabel: "Cod din email",
    codePlaceholder: "Introdu codul primit",
    submitLabel: "Continuă",
    canResend: true,
  },
  phone_code: {
    title: "Autentificare în doi pași",
    description: "Am trimis un cod prin SMS. Introdu codul pentru a continua.",
    codeLabel: "Cod SMS",
    codePlaceholder: "Introdu codul primit",
    submitLabel: "Continuă",
    canResend: true,
  },
  totp: {
    title: "Autentificare în doi pași",
    description: "Introdu codul din aplicația ta de autentificare (Google Authenticator, Authy etc.).",
    codeLabel: "Cod autentificator",
    codePlaceholder: "000000",
    submitLabel: "Continuă",
    canResend: false,
  },
  backup_code: {
    title: "Cod de rezervă",
    description: "Introdu unul dintre codurile de rezervă primite când ai activat 2FA.",
    codeLabel: "Cod de rezervă",
    codePlaceholder: "Introdu codul de rezervă",
    submitLabel: "Continuă",
    canResend: false,
  },
};

export function SignInForm() {
  const { loaded } = useClerk();
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();
  const { t } = useLocale();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [mfaMode, setMfaMode] = useState<MfaMode | null>(null);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string>();

  const loading = fetchStatus === "fetching";
  const hookError = getHookGlobalError(errors);

  if (!loaded) {
    return (
      <AuthCard title="Autentificare">
        <div className="auth-skeleton h-48" />
      </AuthCard>
    );
  }

  const beginMfa = async (mode: MfaMode) => {
    if (mode === "email_code" || mode === "client_trust") {
      const { error } = await signIn.mfa.sendEmailCode();
      if (error) {
        setGlobalError(getClerkErrorMessage(error) ?? "Nu am putut trimite codul pe email.");
        return false;
      }
    }

    if (mode === "phone_code") {
      const { error } = await signIn.mfa.sendPhoneCode();
      if (error) {
        setGlobalError(getClerkErrorMessage(error) ?? "Nu am putut trimite codul prin SMS.");
        return false;
      }
    }

    setMfaMode(mode);
    return true;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(undefined);

    const { error } = await signIn.password({ emailAddress: email, password });
    if (error) {
      setGlobalError(getClerkErrorMessage(error) ?? "Autentificare eșuată.");
      return;
    }

    if (signIn.status === "complete") {
      await finalizeAuth(signIn, router);
      return;
    }

    if (signIn.status === "needs_client_trust") {
      const mode = pickSecondFactor(signIn.supportedSecondFactors, "needs_client_trust");
      if (mode) await beginMfa(mode);
      return;
    }

    if (signIn.status === "needs_second_factor") {
      const mode = pickSecondFactor(signIn.supportedSecondFactors, "needs_second_factor");
      if (!mode) {
        setGlobalError("Contul necesită o verificare suplimentară, dar nu există o metodă disponibilă.");
        return;
      }
      await beginMfa(mode);
      return;
    }

    if (signIn.status === "needs_new_password") {
      router.push("/reset-password");
      return;
    }

    setGlobalError("Autentificarea nu s-a putut finaliza. Încearcă din nou.");
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(undefined);

    if (!mfaMode) return;

    let error;
    switch (mfaMode) {
      case "client_trust":
      case "email_code":
        ({ error } = await signIn.mfa.verifyEmailCode({ code }));
        break;
      case "phone_code":
        ({ error } = await signIn.mfa.verifyPhoneCode({ code }));
        break;
      case "totp":
        ({ error } = await signIn.mfa.verifyTOTP({ code }));
        break;
      case "backup_code":
        ({ error } = await signIn.mfa.verifyBackupCode({ code }));
        break;
    }

    if (error) {
      setGlobalError(getClerkErrorMessage(error) ?? "Cod invalid.");
      return;
    }

    if (signIn.status === "complete") {
      await finalizeAuth(signIn, router);
    }
  };

  const handleResend = async () => {
    if (!mfaMode) return;
    if (mfaMode === "email_code" || mfaMode === "client_trust") {
      await signIn.mfa.sendEmailCode();
    } else if (mfaMode === "phone_code") {
      await signIn.mfa.sendPhoneCode();
    }
  };

  const handleGoogle = async () => {
    setOauthLoading(true);
    setGlobalError(undefined);

    const { error } = await signIn.sso({
      strategy: "oauth_google",
      redirectCallbackUrl: "/sso-callback",
      redirectUrl: "/dashboard",
    });

    if (error) {
      setGlobalError(getClerkErrorMessage(error) ?? "Autentificarea cu Google a eșuat.");
      setOauthLoading(false);
    }
  };

  const handleBack = () => {
    setCode("");
    setMfaMode(null);
    setGlobalError(undefined);
    void signIn.reset();
  };

  if (mfaMode) {
    const copy = MFA_COPY[mfaMode];
    return (
      <VerificationStep
        email={email}
        code={code}
        onCodeChange={setCode}
        onVerify={handleVerify}
        onResend={copy.canResend ? handleResend : undefined}
        onBack={handleBack}
        loading={loading}
        codeError={errors.fields.code?.message}
        globalError={globalError ?? hookError}
        title={copy.title}
        description={
          mfaMode === "client_trust"
            ? undefined
            : copy.description
        }
        codeLabel={copy.codeLabel}
        codePlaceholder={copy.codePlaceholder}
        submitLabel={copy.submitLabel}
      />
    );
  }

  const visibleError = globalError ?? hookError;

  return (
    <AuthCard
      title="Autentificare"
      footer={<AuthFooterLink text="Nu ai cont?" linkText="Creează unul" href="/sign-up" />}
    >
      <AuthOAuthButton onClick={handleGoogle} loading={oauthLoading} label="Continuă cu Google" />

      <AuthDivider />

      {visibleError ? (
        <div className="mb-4">
          <AuthAlert message={visibleError} />
        </div>
      ) : null}

      <form onSubmit={handleSignIn} className="space-y-4">
        <AuthField
          id="email"
          label="Adresă email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nume@exemplu.com"
          autoComplete="email"
          required
          error={errors.fields.identifier?.message}
        />

        <AuthField
          id="password"
          label="Parolă"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Introdu parola"
          autoComplete="current-password"
          required
          error={errors.fields.password?.message}
        />

        <p className="-mt-1 text-right text-sm">
          <Link href="/reset-password" className="font-medium text-[#D4AF37] transition-colors hover:text-[#E8C878]">
            {t("auth.resetPassword.forgotLink")}
          </Link>
        </p>

        <AuthPrimaryButton loading={loading}>Intră în cont</AuthPrimaryButton>
      </form>
    </AuthCard>
  );
}
