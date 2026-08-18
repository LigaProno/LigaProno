import type { Metadata } from "next";
import { Suspense } from "react";
import { currentUser } from "@clerk/nextjs/server";
import { AuthTasksRedirect } from "@/components/auth/auth-tasks-redirect";
import { ConsentGate } from "@/components/consent/consent-gate";
import Sidebar from "@/components/Sidebar";
import PageWrapper from "@/components/PageWrapper";
import { isAdminEmail, canManagePublicTournaments } from "@/lib/admin";
import { syncClerkUserSafe } from "@/lib/sync-clerk-user";
import { getConsentStatus } from "@/app/actions/consent";

/** Tot ce e sub `(app)` cere login — implicit noindex. `/matches` suprascrie. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

async function syncUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;
  return syncClerkUserSafe(clerkUser);
}

/** Sync + admin/moderator flags live behind Suspense so route `loading.tsx` can show immediately. */
async function SyncedSidebar() {
  const email = await syncUser();
  return (
    <Sidebar
      isAdmin={isAdminEmail(email)}
      canManagePublic={canManagePublicTournaments(email)}
    />
  );
}

async function LoggedInConsentGate() {
  const status = await getConsentStatus();
  if (!status.authenticated) return null;

  return (
    <ConsentGate
      needsTerms={!status.termsAccepted}
      needsMarketing={status.marketingConsent === null}
    />
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthTasksRedirect />
      <Suspense fallback={null}>
        <LoggedInConsentGate />
      </Suspense>
      <div className="flex flex-col md:flex-row h-screen overflow-hidden" style={{ backgroundColor: "#0A0B1E" }}>
        <Suspense fallback={<Sidebar isAdmin={false} canManagePublic={false} />}>
          <SyncedSidebar />
        </Suspense>
        <main className="relative flex-1 overflow-y-auto min-h-0 flex flex-col">
          <PageWrapper>{children}</PageWrapper>
        </main>
      </div>
    </>
  );
}
