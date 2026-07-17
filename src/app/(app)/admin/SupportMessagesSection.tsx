import Link from "next/link";
import { Prisma, SupportCategory, SupportStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  SUPPORT_CATEGORY_COLOR,
  SUPPORT_CATEGORY_LABEL,
  SUPPORT_STATUS_META,
} from "@/lib/support-display";
import { SupportCommentBox, SupportStatusButtons } from "./SupportTicketControls";
import { DeleteTicketButton } from "@/components/party/delete-ticket-button";

/** Un filtru = un link cu query params, ca pagina să rămână server component. */
function FilterChip({
  href,
  label,
  active,
  count,
}: {
  href: string;
  label: string;
  active: boolean;
  count?: number;
}) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap"
      style={
        active
          ? { backgroundColor: "#3B82F6", color: "#0A0B1E" }
          : { backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }
      }
    >
      {label}
      {count !== undefined ? ` (${count})` : ""}
    </Link>
  );
}

function buildHref(params: { status?: string; category?: string }): string {
  const q = new URLSearchParams({ tab: "support" });
  if (params.status) q.set("status", params.status);
  if (params.category) q.set("category", params.category);
  return `/admin?${q.toString()}`;
}

function isSupportStatus(v: string | undefined): v is SupportStatus {
  return v === "OPEN" || v === "SEEN" || v === "DONE";
}

function isSupportCategory(v: string | undefined): v is SupportCategory {
  return v === "BUG" || v === "QUESTION" || v === "SUGGESTION" || v === "OTHER";
}

export default async function SupportMessagesSection({
  status,
  category,
}: {
  status?: string;
  category?: string;
}) {
  const where: Prisma.SupportMessageWhereInput = {};
  if (isSupportStatus(status)) where.status = status;
  if (isSupportCategory(category)) where.category = category;

  const [messages, openCount, seenCount, doneCount] = await Promise.all([
    prisma.supportMessage.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: { comments: { orderBy: { createdAt: "asc" } } },
      take: 200,
    }),
    prisma.supportMessage.count({ where: { status: SupportStatus.OPEN } }),
    prisma.supportMessage.count({ where: { status: SupportStatus.SEEN } }),
    prisma.supportMessage.count({ where: { status: SupportStatus.DONE } }),
  ]);

  const activeStatus = isSupportStatus(status) ? status : undefined;
  const activeCategory = isSupportCategory(category) ? category : undefined;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-wide mr-1" style={{ color: "rgba(255,255,255,0.3)" }}>
            Stare
          </span>
          <FilterChip href={buildHref({ category: activeCategory })} label="Toate" active={!activeStatus} />
          <FilterChip
            href={buildHref({ status: "OPEN", category: activeCategory })}
            label="Noi"
            active={activeStatus === "OPEN"}
            count={openCount}
          />
          <FilterChip
            href={buildHref({ status: "SEEN", category: activeCategory })}
            label="În lucru"
            active={activeStatus === "SEEN"}
            count={seenCount}
          />
          <FilterChip
            href={buildHref({ status: "DONE", category: activeCategory })}
            label="Rezolvate"
            active={activeStatus === "DONE"}
            count={doneCount}
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-wide mr-1" style={{ color: "rgba(255,255,255,0.3)" }}>
            Categorie
          </span>
          <FilterChip href={buildHref({ status: activeStatus })} label="Toate" active={!activeCategory} />
          {(Object.keys(SUPPORT_CATEGORY_LABEL) as SupportCategory[]).map((c) => (
            <FilterChip
              key={c}
              href={buildHref({ status: activeStatus, category: c })}
              label={SUPPORT_CATEGORY_LABEL[c]}
              active={activeCategory === c}
            />
          ))}
        </div>
      </div>

      {messages.length === 0 ? (
        <div
          className="rounded-xl border p-10 text-center"
          style={{ borderColor: "rgba(255,255,255,0.06)", borderStyle: "dashed" }}
        >
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>
            Niciun mesaj pentru filtrele selectate.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {messages.map((m) => {
            const statusMeta = SUPPORT_STATUS_META[m.status];
            const isDone = m.status === SupportStatus.DONE;
            return (
              <div
                key={m.id}
                className="rounded-xl border px-4 py-4 flex flex-col gap-3"
                style={{
                  backgroundColor: isDone ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)",
                  borderColor: "rgba(255,255,255,0.08)",
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="text-xs px-2 py-0.5 rounded-md font-semibold"
                        style={{ backgroundColor: "rgba(255,255,255,0.07)", color: SUPPORT_CATEGORY_COLOR[m.category] }}
                      >
                        {SUPPORT_CATEGORY_LABEL[m.category]}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-md font-semibold"
                        style={{ backgroundColor: statusMeta.bg, color: statusMeta.color }}
                      >
                        {statusMeta.label}
                      </span>
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                        {m.createdAt.toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" })}
                      </span>
                    </div>
                    <span className="text-white font-semibold truncate">{m.name}</span>
                    <a
                      href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: [Liga Prono] ${SUPPORT_CATEGORY_LABEL[m.category]}`)}`}
                      className="text-xs truncate hover:underline"
                      style={{ color: "#60A5FA" }}
                    >
                      {m.email}
                    </a>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <SupportStatusButtons messageId={m.id} status={m.status} />
                    <DeleteTicketButton messageId={m.id} admin />
                  </div>
                </div>

                <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
                  {m.message}
                </p>

                {m.comments.length > 0 ? (
                  <div className="flex flex-col gap-2 pl-3 border-l-2" style={{ borderColor: "rgba(59,130,246,0.35)" }}>
                    {m.comments.map((c) => (
                      <div key={c.id} className="flex flex-col gap-0.5">
                        <span className="text-[10px] uppercase tracking-wide" style={{ color: "rgba(96,165,250,0.8)" }}>
                          Răspuns Liga Prono · {c.createdAt.toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" })}
                        </span>
                        <p className="text-sm whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.85)" }}>
                          {c.body}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}

                <SupportCommentBox messageId={m.id} />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
