"use client";

import { Suspense, type ReactNode } from "react";
import { NavigationLoadingOverlay } from "@/components/ui/navigation-loading-overlay";
import { SiteFooter } from "@/components/site-footer";

export default function PageWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-full flex-col">
      <div className="flex-1 w-full">{children}</div>
      <SiteFooter variant="app" />
      <Suspense fallback={null}>
        <NavigationLoadingOverlay />
      </Suspense>
    </div>
  );
}
