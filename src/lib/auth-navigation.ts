import type { SignInFutureResource, SignUpFutureResource } from "@clerk/shared/types";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export async function finalizeAuth(
  resource: SignInFutureResource | SignUpFutureResource,
  router: AppRouterInstance,
  redirectUrl = "/dashboard",
) {
  await resource.finalize({
    navigate: ({ session, decorateUrl }) => {
      if (session?.currentTask) return;

      const url = decorateUrl(redirectUrl);
      if (url.startsWith("http")) {
        window.location.href = url;
      } else {
        router.push(url);
      }
    },
  });
}
