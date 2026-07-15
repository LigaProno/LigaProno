"use client";

import { HandleSSOCallback } from "@clerk/react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { navigateAfterAuthFromCallback } from "@/lib/auth-redirect";

const SSO_CALLBACK_TIMEOUT_MS = 15_000;

export default function SsoCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.location.assign("/dashboard");
    }, SSO_CALLBACK_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="auth-page flex min-h-screen flex-col items-center justify-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-[#C5A059]" aria-hidden />
      <p className="text-sm text-white/60">Se finalizează autentificarea...</p>

      <HandleSSOCallback
        navigateToApp={(params) => navigateAfterAuthFromCallback(router, params, "/dashboard")}
        navigateToSignIn={() => router.push("/sign-in")}
        navigateToSignUp={() => router.push("/sign-up")}
      />
    </main>
  );
}
