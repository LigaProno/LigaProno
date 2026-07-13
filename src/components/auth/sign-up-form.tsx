"use client";

import { useClerk, useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
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

export function SignUpForm() {
  const { loaded } = useClerk();
  const { signUp, errors, fetchStatus } = useSignUp();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [oauthLoading, setOauthLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string>();
  const [verifying, setVerifying] = useState(false);

  const loading = fetchStatus === "fetching";
  const hookError = getHookGlobalError(errors);

  if (!loaded) {
    return (
      <AuthCard title="Creare cont">
        <div className="auth-skeleton h-48" />
      </AuthCard>
    );
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(undefined);

    const { error } = await signUp.password({ emailAddress: email, password });
    if (error) {
      setGlobalError(getClerkErrorMessage(error) ?? "Înregistrare eșuată.");
      return;
    }

    if (signUp.status === "complete") {
      await finalizeAuth(signUp, router, "/profil?onboarding=1");
      return;
    }

    if (
      signUp.status === "missing_requirements" &&
      signUp.unverifiedFields.includes("email_address")
    ) {
      const { error: sendError } = await signUp.verifications.sendEmailCode();
      if (sendError) {
        setGlobalError(getClerkErrorMessage(sendError) ?? "Nu s-a putut trimite codul.");
        return;
      }
      setVerifying(true);
      return;
    }

    setGlobalError("Înregistrarea nu s-a putut finaliza. Încearcă din nou.");
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(undefined);

    const { error } = await signUp.verifications.verifyEmailCode({ code });
    if (error) {
      setGlobalError(getClerkErrorMessage(error) ?? "Cod invalid.");
      return;
    }

    if (signUp.status === "complete") {
      await finalizeAuth(signUp, router, "/profil?onboarding=1");
    }
  };

  const handleGoogle = async () => {
    setOauthLoading(true);
    setGlobalError(undefined);

    const { error } = await signUp.sso({
      strategy: "oauth_google",
      redirectCallbackUrl: "/sso-callback",
      redirectUrl: "/profil?onboarding=1",
    });

    if (error) {
      setGlobalError(getClerkErrorMessage(error) ?? "Înregistrarea cu Google a eșuat.");
      setOauthLoading(false);
    }
  };

  const handleBack = () => {
    setCode("");
    setVerifying(false);
    setGlobalError(undefined);
    void signUp.reset();
  };

  if (verifying) {
    return (
      <VerificationStep
        email={email}
        code={code}
        onCodeChange={setCode}
        onVerify={handleVerify}
        onResend={async () => {
          await signUp.verifications.sendEmailCode();
        }}
        onBack={handleBack}
        loading={loading}
        codeError={errors.fields.code?.message}
        globalError={globalError ?? hookError}
      />
    );
  }

  const visibleError = globalError ?? hookError;

  return (
    <AuthCard
      title="Creare cont"
      footer={<AuthFooterLink text="Ai deja cont?" linkText="Autentifică-te" href="/sign-in" />}
    >
      <AuthOAuthButton onClick={handleGoogle} loading={oauthLoading} label="Continuă cu Google" />

      <AuthDivider />

      {visibleError ? (
        <div className="mb-4">
          <AuthAlert message={visibleError} />
        </div>
      ) : null}

      <form onSubmit={handleSignUp} className="space-y-4">
        <AuthField
          id="email"
          label="Adresă email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nume@exemplu.com"
          autoComplete="email"
          required
          error={errors.fields.emailAddress?.message}
        />

        <AuthField
          id="password"
          label="Parolă"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Minim 8 caractere"
          autoComplete="new-password"
          required
          minLength={8}
          error={errors.fields.password?.message}
        />

        <AuthPrimaryButton loading={loading}>Creează cont</AuthPrimaryButton>
      </form>

      <div id="clerk-captcha" className="hidden" />
    </AuthCard>
  );
}
