import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";
import PageWrapper from "@/components/PageWrapper";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { getLocaleFromCookies } from "@/lib/i18n/server";
import { isAdminEmail } from "@/lib/admin";

async function syncUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
  const data = {
    email,
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    imageUrl: clerkUser.imageUrl,
  };

  const existing = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (existing) {
    await prisma.user.update({ where: { clerkId: clerkUser.id }, data });
  } else {
    await prisma.user.create({ data: { clerkId: clerkUser.id, ...data } });
  }

  return email;
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocaleFromCookies();
  const email = await syncUser();
  const admin = isAdminEmail(email);

  return (
    <LocaleProvider initialLocale={locale}>
      <div className="flex flex-col md:flex-row h-screen overflow-hidden" style={{ backgroundColor: "#080B12" }}>
        <Sidebar isAdmin={admin} />
        <main className="flex-1 overflow-y-auto min-h-0 flex flex-col">
          <PageWrapper>{children}</PageWrapper>
        </main>
      </div>
    </LocaleProvider>
  );
}
