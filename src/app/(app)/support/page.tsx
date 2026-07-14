import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { pageTitle } from "@/lib/site-metadata";
import SupportForm from "./SupportForm";

export const metadata = pageTitle("Support");
export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const { userId: clerkId } = await auth();

  let prefillName  = "";
  let prefillEmail = "";

  if (clerkId) {
    const [dbUser, clerkUser] = await Promise.all([
      prisma.user.findUnique({ where: { clerkId }, select: { email: true } }),
      currentUser(),
    ]);
    prefillEmail = dbUser?.email ?? "";
    prefillName  = clerkUser?.fullName ?? clerkUser?.firstName ?? "";
  }

  return (
    <main className="min-h-screen p-6 sm:p-10 lg:p-14 pb-24 page-transition">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">

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
            { icon: "📧", label: "Email direct", value: "Liga Prono6767@gmail.com" },
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

        {/* Form */}
        <SupportForm prefillName={prefillName} prefillEmail={prefillEmail} />

      </div>
    </main>
  );
}
