import type { SignInFutureResource, SignUpFutureResource } from "@clerk/shared/types";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { navigateAfterAuth } from "@/lib/auth-redirect";
import { isSessionExistsError } from "@/lib/clerk-errors";

export async function finalizeAuth(
  resource: SignInFutureResource | SignUpFutureResource,
  router: AppRouterInstance,
  redirectUrl = "/dashboard",
) {
  try {
    await resource.finalize({
      navigate: (params) => navigateAfterAuth(router, params, redirectUrl),
    });
  } catch (error) {
    // Sesiune deja activă / finalize eșuat după auth reușit — nu lăsăm userul pe form.
    if (isSessionExistsError(error)) {
      window.location.assign(redirectUrl);
      return;
    }

    // Fallback: dacă finalize a eșuat din alt motiv dar cookie-ul e deja setat,
    // un full reload pe destinație e mai bun decât un formular blocat.
    console.error("[finalizeAuth]", error);
    window.location.assign(redirectUrl);
  }
}
