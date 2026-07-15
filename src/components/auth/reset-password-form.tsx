"use client";

import { useClerk, useSignIn, useSession, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AuthAlert,
  AuthCard,
  AuthField,
  AuthFooterLink,
  AuthPrimaryButton,
} from "@/components/auth/auth-ui";
import { finalizeAuth } from "@/lib/auth-navigation";
import { useLocale } from "@/components/i18n/locale-provider";
import { getClerkErrorMessage, getHookGlobalError } from "@/lib/clerk-errors";

type Step = "request" | "verify" | "password";

export function ResetPasswordForm() {
  const { loaded } = useClerk();
  const { signIn, errors, fetchStatus } = useSignIn();
  const { session } = useSession();
  const { user } = useUser();
  const router = useRouter();
  const { t } = useLocale();

  const isSessionTask = session?.currentTask?.key === "reset-password";
  const prefilledEmail = user?.primaryEmailAddress?.emailAddress ?? "";

  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [globalError, setGlobalError] = useState<string>();
  const [sessionTaskStarted, setSessionTaskStarted] = useState(false);

  const loading = fetchStatus === "fetching";
  const hookError = getHookGlobalError(errors);

  useEffect(() => {
    if (prefilledEmail && !email) setEmail(prefilledEmail);
  }, [prefilledEmail, email]);

  useEffect(() => {
    if (!loaded || !isSessionTask || sessionTaskStarted || !prefilledEmail) return;

    setSessionTaskStarted(true);
    void (async () => {
      setGlobalError(undefined);
      const { error: createError } = await signIn.create({ identifier: prefilledEmail });
      if (createError) {
        setGlobalError(getClerkErrorMessage(createError) ?? t("errors.generic"));
        return;
      }
      const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();
      if (sendError) {
        setGlobalError(getClerkErrorMessage(sendError) ?? t("errors.generic"));
        return;
      }
      setEmail(prefilledEmail);
      setStep("verify");
    })();
  }, [loaded, isSessionTask, sessionTaskStarted, prefilledEmail, signIn, t]);

  useEffect(() => {
    if (signIn.status === "needs_new_password") {
      setStep("password");
    }
  }, [signIn.status]);

  if (!loaded) {
    return (
      <AuthCard title={t("auth.resetPassword.title")}>
        <div className="auth-skeleton h-48" />
      </AuthCard>
    );
  }

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(undefined);

    const { error: createError } = await signIn.create({ identifier: email.trim() });
    if (createError) {
      setGlobalError(getClerkErrorMessage(createError) ?? t("errors.generic"));
      return;
    }

    const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();
    if (sendError) {
      setGlobalError(getClerkErrorMessage(sendError) ?? t("errors.generic"));
      return;
    }

    setStep("verify");
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(undefined);

    const { error } = await signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() });
    if (error) {
      setGlobalError(getClerkErrorMessage(error) ?? t("auth.resetPassword.invalidCode"));
      return;
    }

    setStep("password");
  };

  const handleResendCode = async () => {
    setGlobalError(undefined);
    const { error } = await signIn.resetPasswordEmailCode.sendCode();
    if (error) {
      setGlobalError(getClerkErrorMessage(error) ?? t("errors.generic"));
    }
  };

  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(undefined);

    if (password.length < 8) {
      setGlobalError(t("profile.password.tooShort"));
      return;
    }
    if (password !== confirmPassword) {
      setGlobalError(t("profile.password.mismatch"));
      return;
    }

    const { error } = await signIn.resetPasswordEmailCode.submitPassword({
      password,
      signOutOfOtherSessions: true,
    });
    if (error) {
      setGlobalError(getClerkErrorMessage(error) ?? t("errors.generic"));
      return;
    }

    if (signIn.status === "complete") {
      await finalizeAuth(signIn, router, "/dashboard");
      return;
    }

    setGlobalError(t("errors.generic"));
  };

  const visibleError = globalError ?? hookError;

  if (step === "password" || signIn.status === "needs_new_password") {
    return (
      <AuthCard
        title={t("auth.resetPassword.newPasswordTitle")}
        footer={
          <AuthFooterLink
            text={t("auth.resetPassword.backToSignInPrefix")}
            linkText={t("auth.resetPassword.backToSignIn")}
            href="/sign-in"
          />
        }
      >
        {isSessionTask ? (
          <p className="mb-4 text-center text-sm text-white/55">{t("auth.resetPassword.sessionTaskHint")}</p>
        ) : null}

        {visibleError ? (
          <div className="mb-4">
            <AuthAlert message={visibleError} />
          </div>
        ) : null}

        <form onSubmit={handleSubmitPassword} className="space-y-4">
          <AuthField
            id="password"
            label={t("auth.resetPassword.newPassword")}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            error={errors.fields.password?.message}
          />
          <AuthField
            id="confirmPassword"
            label={t("auth.resetPassword.confirmPassword")}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
          />
          <AuthPrimaryButton loading={loading}>{t("auth.resetPassword.submit")}</AuthPrimaryButton>
        </form>
      </AuthCard>
    );
  }

  if (step === "verify") {
    return (
      <AuthCard
        title={t("auth.resetPassword.verifyTitle")}
        footer={
          <AuthFooterLink
            text={t("auth.resetPassword.backToSignInPrefix")}
            linkText={t("auth.resetPassword.backToSignIn")}
            href="/sign-in"
          />
        }
      >
        <p className="mb-5 text-center text-sm leading-relaxed text-white/55">
          {t("auth.resetPassword.codeSent")}{" "}
          <span className="font-medium text-white/80">{email}</span>
        </p>

        {visibleError ? (
          <div className="mb-4">
            <AuthAlert message={visibleError} />
          </div>
        ) : null}

        <form onSubmit={handleVerifyCode} className="space-y-4">
          <AuthField
            id="code"
            label={t("auth.resetPassword.codeLabel")}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t("auth.resetPassword.codePlaceholder")}
            autoComplete="one-time-code"
            inputMode="numeric"
            required
            error={errors.fields.code?.message}
          />
          <AuthPrimaryButton loading={loading}>{t("auth.resetPassword.verify")}</AuthPrimaryButton>
        </form>

        <div className="mt-4 flex flex-col items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => void handleResendCode()}
            disabled={loading}
            className="font-medium text-[#D4AF37] transition-colors hover:text-[#E8C878] disabled:opacity-50"
          >
            {t("auth.resetPassword.resend")}
          </button>
          {!isSessionTask ? (
            <button
              type="button"
              onClick={() => {
                setStep("request");
                setCode("");
                setGlobalError(undefined);
              }}
              className="text-white/45 transition-colors hover:text-white/70"
            >
              {t("auth.resetPassword.changeEmail")}
            </button>
          ) : null}
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={t("auth.resetPassword.title")}
      footer={
        <AuthFooterLink
          text={t("auth.resetPassword.backToSignInPrefix")}
          linkText={t("auth.resetPassword.backToSignIn")}
          href="/sign-in"
        />
      }
    >
      {isSessionTask ? (
        <p className="mb-4 text-center text-sm text-white/55">{t("auth.resetPassword.sessionTaskHint")}</p>
      ) : (
        <p className="mb-4 text-center text-sm text-white/55">{t("auth.resetPassword.subtitle")}</p>
      )}

      {visibleError ? (
        <div className="mb-4">
          <AuthAlert message={visibleError} />
        </div>
      ) : null}

      {isSessionTask && !sessionTaskStarted ? (
        <p className="text-center text-sm text-white/45">{t("common.loading")}</p>
      ) : (
        <form onSubmit={handleSendCode} className="space-y-4">
          <AuthField
            id="email"
            label={t("auth.resetPassword.emailLabel")}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            readOnly={isSessionTask}
            error={errors.fields.identifier?.message}
          />
          <AuthPrimaryButton loading={loading}>{t("auth.resetPassword.sendCode")}</AuthPrimaryButton>
        </form>
      )}

      <p className="mt-4 text-center text-sm text-white/45">
        <Link href="/sign-in" className="font-medium text-[#D4AF37] hover:text-[#E8C878]">
          {t("auth.resetPassword.backToSignIn")}
        </Link>
      </p>
    </AuthCard>
  );
}
