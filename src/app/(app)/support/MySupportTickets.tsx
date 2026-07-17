import { prisma } from "@/lib/prisma";
import {
  SUPPORT_CATEGORY_COLOR,
  SUPPORT_CATEGORY_LABEL,
  SUPPORT_STATUS_META,
} from "@/lib/support-display";
import { DeleteTicketButton } from "@/components/party/delete-ticket-button";

/** Lista tichetelor userului cu starea lor și răspunsurile de la Liga Prono. */
export default async function MySupportTickets({ userId }: { userId: string }) {
  const tickets = await prisma.supportMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { comments: { orderBy: { createdAt: "asc" } } },
    take: 50,
  });

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-bold text-white">Tichetele mele</h2>

      {tickets.length === 0 ? (
        <div
          className="rounded-xl border p-8 text-center"
          style={{ borderColor: "rgba(255,255,255,0.08)", borderStyle: "dashed" }}
        >
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
            Nu ai trimis niciun tichet încă. Aici vei vedea progresul și răspunsurile noastre.
          </p>
        </div>
      ) : null}

      {tickets.map((t) => {
        const statusMeta = SUPPORT_STATUS_META[t.status];
        return (
          <div
            key={t.id}
            className="rounded-xl border px-4 py-4 flex flex-col gap-3"
            style={{ backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.08)" }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <span
                  className="text-xs px-2 py-0.5 rounded-md font-semibold"
                  style={{ backgroundColor: "rgba(255,255,255,0.07)", color: SUPPORT_CATEGORY_COLOR[t.category] }}
                >
                  {SUPPORT_CATEGORY_LABEL[t.category]}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-md font-semibold"
                  style={{ backgroundColor: statusMeta.bg, color: statusMeta.color }}
                >
                  {statusMeta.label}
                </span>
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {t.createdAt.toLocaleDateString("ro-RO", { timeZone: "Europe/Bucharest", day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              {t.status === "DONE" ? <DeleteTicketButton messageId={t.id} /> : null}
            </div>

            <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
              {t.message}
            </p>

            {t.comments.length > 0 ? (
              <div className="flex flex-col gap-2 pl-3 border-l-2" style={{ borderColor: "rgba(59,130,246,0.35)" }}>
                {t.comments.map((c) => (
                  <div key={c.id} className="flex flex-col gap-0.5">
                    <span className="text-[10px] uppercase tracking-wide" style={{ color: "rgba(96,165,250,0.8)" }}>
                      Răspuns Liga Prono · {c.createdAt.toLocaleDateString("ro-RO", { timeZone: "Europe/Bucharest", day: "numeric", month: "short" })}
                    </span>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.9)" }}>
                      {c.body}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                {t.status === "OPEN"
                  ? "Am primit tichetul. Îți răspundem în curând."
                  : "Lucrăm la el — vei vedea aici răspunsul nostru."}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
