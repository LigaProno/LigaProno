import type { SignInFutureResource, SignUpFutureResource } from "@clerk/shared/types";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { navigateAfterAuth } from "@/lib/auth-redirect";

export async function finalizeAuth(
  resource: SignInFutureResource | SignUpFutureResource,
  router: AppRouterInstance,
  redirectUrl = "/dashboard",
) {
  await resource.finalize({
    navigate: (params) => navigateAfterAuth(router, params, redirectUrl),
  });
}
