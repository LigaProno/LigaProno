import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { pageTitle } from "@/lib/site-metadata";
import SupportForm from "./SupportForm";
import MySupportTickets from "./MySupportTickets";

export const metadata = pageTitle("Support");
export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const { userId: clerkId } = await auth();

  let prefillName  = "";
  let prefillEmail = "";
  let dbUserId: string | null = null;

  if (clerkId) {
    const [dbUser, clerkUser] = await Promise.all([
      prisma.user.findUnique({ where: { clerkId }, select: { id: true, email: true } }),
      currentUser(),
    ]);
    dbUserId = dbUser?.id ?? null;
    prefillEmail = dbUser?.email ?? "";
    prefillName  = clerkUser?.fullName ?? clerkUser?.firstName ?? "";
  }

  return (
    <main className="min-h-screen p-6 sm:p-10 lg:p-14 pb-24 page-transition">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">

        {/* Header */}
        <div className="flex flex-col gap-1">
          <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "#22D3EE" }}>
            Liga Prono
          </p>
          <h1 className="text-3xl font-bold text-white">Support</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
            Ai o problemă sau o întrebare? Completează formularul și îți răspundem în maxim 24 de ore.
          </p>
        </div>

        {/* Info strip */}
        <div
          className="rounded-xl p-4 flex flex-wrap gap-6"
          style={{ backgroundColor: "rgba(34,211,238,0.05)", border: "1px solid rgba(34,211,238,0.14)" }}
        >
          {[
            { icon: "⏱", label: "Timp răspuns", value: "< 24h" },
            { icon: "📧", label: "Email direct", value: "pronohub6767@gmail.com" },
            { icon: "🐛", label: "Bug report?", value: "Include pașii de reproducere" },
          ].map(({ icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 min-w-0">
              <span className="text-lg shrink-0">{icon}</span>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</p>
                <p className="text-sm font-medium truncate" style={{ color: "rgba(255,255,255,0.75)" }}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Two columns: form left, my tickets right (stacked on mobile) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <SupportForm prefillName={prefillName} prefillEmail={prefillEmail} />
          {dbUserId ? <MySupportTickets userId={dbUserId} /> : null}
        </div>

      </div>
    </main>
  );
}
