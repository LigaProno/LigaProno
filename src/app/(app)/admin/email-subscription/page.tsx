import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admin";
import EmailSubscriptionList from "./EmailSubscriptionList";
import EmailComposer from "./EmailComposer";

export default async function EmailSubscriptionPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user || !isAdminEmail(user.email)) redirect("/dashboard");

  const [subscribedUsers, totalUsers, recentlySubscribed] = await Promise.all([
    prisma.user.count({ where: { marketingConsent: true } }),
    prisma.user.count(),
    prisma.user.count({
      where: {
        marketingConsent: true,
        marketingConsentAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  return (
    <div className="w-full p-4 sm:p-6 md:p-8 max-w-5xl mx-auto">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm mb-6 hover:opacity-80 transition-opacity"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Admin
      </Link>

      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Email Marketing</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
            Gestionează lista de abonați și trimite emailuri de marketing.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Abonați"
            value={subscribedUsers}
            subtext={`din ${totalUsers} utilizatori`}
            accent="#22C55E"
          />
          <StatCard
            label="Rată abonare"
            value={`${totalUsers > 0 ? Math.round((subscribedUsers / totalUsers) * 100) : 0}%`}
            subtext="din toți utilizatorii"
            accent="#3B82F6"
          />
          <StatCard
            label="Abonați noi"
            value={recentlySubscribed}
            subtext="ultima săptămână"
            accent="#F59E0B"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section
            className="rounded-xl border p-5 flex flex-col gap-4"
            style={{
              backgroundColor: "rgba(255,255,255,0.06)",
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            <div>
              <h2 className="text-white font-bold text-base">Compune email</h2>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                Trimite un email către toți abonații.
              </p>
            </div>
            <EmailComposer subscriberCount={subscribedUsers} />
          </section>

          <section
            className="rounded-xl border p-5 flex flex-col gap-4"
            style={{
              backgroundColor: "rgba(255,255,255,0.06)",
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            <div>
              <h2 className="text-white font-bold text-base">Lista abonați</h2>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                Utilizatori care au acceptat să primească emailuri de marketing.
              </p>
            </div>
            <EmailSubscriptionList />
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtext,
  accent,
}: {
  label: string;
  value: string | number;
  subtext: string;
  accent: string;
}) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        backgroundColor: "rgba(255,255,255,0.06)",
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      <p className="text-xs font-medium mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>
        {label}
      </p>
      <p className="text-2xl font-bold" style={{ color: accent }}>
        {value}
      </p>
      <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
        {subtext}
      </p>
    </div>
  );
}
