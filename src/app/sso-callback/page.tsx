"use client";

import { HandleSSOCallback } from "@clerk/react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SsoCallbackPage() {
  const router = useRouter();

  return (
    <main className="auth-page flex min-h-screen flex-col items-center justify-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-[#C5A059]" aria-hidden />
      <p className="text-sm text-white/60">Se finalizează autentificarea...</p>

      <HandleSSOCallback
        navigateToApp={({ session, decorateUrl }) => {
          if (session?.currentTask) return;

          const url = decorateUrl("/dashboard");
          if (url.startsWith("http")) {
            window.location.href = url;
          } else {
            router.push(url);
          }
        }}
        navigateToSignIn={() => router.push("/sign-in")}
        navigateToSignUp={() => router.push("/sign-up")}
      />
    </main>
  );
}
