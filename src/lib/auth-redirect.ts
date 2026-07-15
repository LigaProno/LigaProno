import type { SetActiveNavigate } from "@clerk/shared/types";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

type NavigateParams = Parameters<SetActiveNavigate>[0];

/** Unde trimitem userul după login/OAuth — nu lăsăm spinner infinit pe task-uri necunoscute. */
export function resolvePostAuthDestination(
  { session, decorateUrl }: NavigateParams,
  defaultPath: string,
): string {
  const task = session?.currentTask?.key;

  if (task === "reset-password") {
    return decorateUrl("/reset-password");
  }

  // MFA / organizații nu sunt folosite — continuăm în app.
  return decorateUrl(defaultPath);
}

/** Navigare robustă după auth (full page load — mai sigur pe mobile). */
export function navigateAfterAuth(
  _router: AppRouterInstance,
  params: NavigateParams,
  defaultPath = "/dashboard",
) {
  const url = resolvePostAuthDestination(params, defaultPath);
  window.location.assign(url);
}

export function navigateAfterAuthFromCallback(
  _router: AppRouterInstance,
  params: NavigateParams,
  defaultPath = "/dashboard",
) {
  navigateAfterAuth(_router, params, defaultPath);
}
