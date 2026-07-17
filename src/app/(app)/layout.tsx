import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { AuthTasksRedirect } from "@/components/auth/auth-tasks-redirect";
import Sidebar from "@/components/Sidebar";
import PageWrapper from "@/components/PageWrapper";
import { isAdminEmail } from "@/lib/admin";
import { syncClerkUserSafe } from "@/lib/sync-clerk-user";

/** Tot ce e sub `(app)` cere login — implicit noindex. `/matches` suprascrie. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

async function syncUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;
  return syncClerkUserSafe(clerkUser);
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const email = await syncUser();
  const admin = isAdminEmail(email);

  return (
    <>
      <AuthTasksRedirect />
      <div className="flex flex-col md:flex-row h-screen overflow-hidden" style={{ backgroundColor: "#0A0B1E" }}>
        <Sidebar isAdmin={admin} />
        <main className="flex-1 overflow-y-auto min-h-0 flex flex-col">
          <PageWrapper>{children}</PageWrapper>
        </main>
      </div>
    </>
  );
}
