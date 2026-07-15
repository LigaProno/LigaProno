"use client";

import { useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";

const CYAN = "#3B82F6";
const LIME = "#60A5FA";

function ScoreRow({ icon, label, pts, color = CYAN }: { icon: string; label: string; pts: string; color?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b last:border-b-0" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-base shrink-0">{icon}</span>
        <span className="text-sm leading-snug" style={{ color: "rgba(255,255,255,0.68)" }}>{label}</span>
      </div>
      <span className="text-sm font-bold tabular-nums shrink-0" style={{ color }}>{pts}</span>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between gap-3 py-3.5 text-left cursor-pointer">
        <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.82)" }}>{q}</span>
        <svg className="w-4 h-4 shrink-0 transition-transform duration-200" style={{ color: "rgba(255,255,255,0.3)", transform: open ? "rotate(180deg)" : "rotate(0deg)" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <p className="text-sm pb-4 leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{a}</p>}
    </div>
  );
}

export default function RulesModal() {
  const [open, setOpen] = useState(false);
  const { locale } = useLocale();
  const ro = locale === "ro";

  const faq = ro
    ? [
        { q: "Când se acordă punctele?", a: "Automat, după ce fiecare meci se finalizează. Clasamentul se actualizează în timp real." },
        { q: "Pot vedea pronosticurile celorlalți?", a: "Da — din clasamentul turneului sau din pagina fiecărui participant." },
        { q: "Ce se întâmplă dacă nu există cote?", a: "Se aplică punctele de bază fără multiplicare: 0.5 pct pentru pauză, 1 pct pentru rezultat final, 3 pct pentru scor exact." },
        { q: "Pot fi în mai multe turnee simultan?", a: "Da, poți crea sau te poți alătura oricâtor turnee. Fiecare are clasamentul și pronosticurile lui separate." },
        { q: "Cum funcționează codul de invitație?", a: "La creare, primești un cod unic de 10 caractere. Distribuie-l prietenilor — ei îl introduc în secțiunea 'Alătură-te'." },
        { q: "Cum funcționează perioada turneului?", a: "La creare, poți alege câte etape să dureze turneul (minim 4). Acesta începe automat de la prima etapă viitoare." },
      ]
    : [
        { q: "When are points awarded?", a: "Automatically after each match finishes. The leaderboard updates in real time." },
        { q: "Can I see others' predictions?", a: "Yes — from the tournament leaderboard or each member's prediction page." },
        { q: "What if there are no odds?", a: "Base points apply without multiplication: 0.5 pts for half-time, 1 pt for full-time result, 3 pts for exact score." },
        { q: "Can I be in multiple tournaments at once?", a: "Yes. Each has its own leaderboard and predictions." },
        { q: "How does the invite code work?", a: "When you create a tournament you get a unique 10-character code. Share it — friends enter it under Join tournament." },
        { q: "How does the fixture period work?", a: "Pick how many matchdays to play (min 4). Starts from the next upcoming matchday at creation time." },
      ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full"
        style={{ color: "rgba(255,255,255,0.35)" }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.6)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.35)")}
      >
        <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.7} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 17v-5m0-4h.01" />
        </svg>
        {ro ? "Cum funcționează?" : "How it works?"}
      </button>

      {open && (
        <>
          <div className="ph-modal-backdrop" onClick={() => setOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 pointer-events-none">
            <div className="ph-modal w-full sm:max-w-lg max-h-[92vh] sm:max-h-[88vh] flex flex-col rounded-t-2xl sm:rounded-2xl pointer-events-auto overflow-hidden">

              {/* Header with gradient accent */}
              <div
                className="flex items-center justify-between px-6 py-5 shrink-0"
                style={{
                  background: "linear-gradient(135deg, rgba(59,130,246,0.10) 0%, rgba(59,130,246,0.02) 60%, transparent 100%)",
                  borderBottom: "1px solid rgba(59,130,246,0.13)",
                }}
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-1" style={{ color: CYAN }}>Liga Prono</p>
                  <h2 className="text-lg font-bold text-white">{ro ? "Cum funcționează?" : "How it works?"}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{ color: "rgba(255,255,255,0.4)", backgroundColor: "rgba(255,255,255,0.06)" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.10)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.06)")}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto flex flex-col gap-7 px-6 py-6">

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] mb-3" style={{ color: "rgba(255,255,255,0.28)" }}>
                    {ro ? "Punctaj per meci" : "Points per match"}
                  </p>
                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)", backgroundColor: "rgba(255,255,255,0.02)" }}>
                    <div className="px-4 pt-1 pb-1">
                      <ScoreRow icon="⏱" label={ro ? "Rezultat la pauză (1 / X / 2)" : "Half-time result (1 / X / 2)"} pts={ro ? "0.5 × cotă" : "0.5 × odds"} color={CYAN} />
                      <ScoreRow icon="⚽" label={ro ? "Rezultat final 90 min (1 / X / 2)" : "Full-time result 90 min (1 / X / 2)"} pts={ro ? "1 × cotă" : "1 × odds"} color={CYAN} />
                      <ScoreRow icon="🎯" label={ro ? "Scor exact (după 90 min)" : "Exact score (after 90 min)"} pts={ro ? "3 × cotă" : "3 × odds"} color={LIME} />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] mb-3" style={{ color: "rgba(255,255,255,0.28)" }}>
                    {ro ? "Rolul cotelor" : "How odds work"}
                  </p>
                  <p className="text-sm leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.50)" }}>
                    {ro ?
                      "Pauză+final folosesc cota HT/FT combinată (0.5×1 × cotă). Scorul exact e independent și se adună."
                    : "HT+FT use combined HT/FT odds (0.5×1 × odds). Exact score is independent and added on top."}
                  </p>
                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="flex items-center justify-between gap-2 px-4 py-3 border-b text-sm" style={{ borderColor: "rgba(255,255,255,0.05)", backgroundColor: "rgba(255,255,255,0.025)" }}>
                      <span style={{ color: "rgba(255,255,255,0.6)" }}>{ro ? "Favorit câștigă" : "Favourite wins"}</span>
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>cotă 1.4</span>
                      <span className="font-bold tabular-nums" style={{ color: CYAN }}>1 × 1.4 = 1.4 pct</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 px-4 py-3 text-sm" style={{ backgroundColor: "rgba(255,255,255,0.01)" }}>
                      <span style={{ color: "rgba(255,255,255,0.6)" }}>{ro ? "Surpriză mare" : "Big upset"}</span>
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>cotă 5.0</span>
                      <span className="font-bold tabular-nums" style={{ color: LIME }}>1 × 5.0 = 5.0 pct</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] mb-3" style={{ color: "rgba(255,255,255,0.28)" }}>FAQ</p>
                  <div>{faq.map((item, i) => <FaqItem key={i} q={item.q} a={item.a} />)}</div>
                </div>

                <div className="pb-2" />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
