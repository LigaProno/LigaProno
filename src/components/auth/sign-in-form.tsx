"use client";

import { useClerk, useSignIn } from "@clerk/nextjs";
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

export function SignInForm() {
  const { loaded } = useClerk();
  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [oauthLoading, setOauthLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string>();

  const loading = fetchStatus === "fetching";
  const needsVerification = signIn.status === "needs_client_trust";
  const hookError = getHookGlobalError(errors);

  if (!loaded) {
    return (
      <AuthCard title="Autentificare">
        <div className="auth-skeleton h-48" />
      </AuthCard>
    );
  }

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
      await signIn.mfa.sendEmailCode();
      return;
    }

    if (signIn.status === "needs_second_factor") {
      setGlobalError("Este necesară autentificarea în doi pași.");
      return;
    }

    setGlobalError("Autentificarea nu s-a putut finaliza. Încearcă din nou.");
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(undefined);

    const { error } = await signIn.mfa.verifyEmailCode({ code });
    if (error) {
      setGlobalError(getClerkErrorMessage(error) ?? "Cod invalid.");
      return;
    }

    if (signIn.status === "complete") {
      await finalizeAuth(signIn, router);
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
    setGlobalError(undefined);
    void signIn.reset();
  };

  if (needsVerification) {
    return (
      <VerificationStep
        email={email}
        code={code}
        onCodeChange={setCode}
        onVerify={handleVerify}
        onResend={async () => {
          await signIn.mfa.sendEmailCode();
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

        <AuthPrimaryButton loading={loading}>Intră în cont</AuthPrimaryButton>
      </form>
    </AuthCard>
  );
}
