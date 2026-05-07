import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";
import PageWrapper from "@/components/PageWrapper";

async function syncUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) return;

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
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await syncUser();

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden" style={{ backgroundColor: "#0F172A" }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto min-h-0 flex flex-col">
        <PageWrapper>{children}</PageWrapper>
      </main>
    </div>
  );
}
