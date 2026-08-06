/**
 * Vizibil DOAR adminilor. Câți membri au pus efectiv cel puțin un pronostic
 * (useri activi) din total membri — contorul de membri nu mai e relevant de
 * când turneele publice înscriu automat pe toată lumea.
 */
export function AdminActivityPanel({
  activeCount,
  totalMembers,
}: {
  activeCount: number;
  totalMembers: number;
}) {
  const pct = totalMembers > 0 ? Math.round((activeCount / totalMembers) * 100) : 0;

  return (
    <div
      className="mb-6 rounded-2xl border p-4 sm:p-5 flex items-center gap-4"
      style={{ borderColor: "rgba(168,85,247,0.35)", backgroundColor: "rgba(168,85,247,0.07)" }}
    >
      <span className="text-2xl shrink-0" aria-hidden>👁️</span>
      <div className="flex flex-col gap-0.5 min-w-0">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          Useri activi
          <span
            className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
            style={{ backgroundColor: "rgba(168,85,247,0.25)", color: "#C084FC" }}
          >
            doar admin
          </span>
        </h2>
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
          <span className="text-lg font-extrabold text-white">{activeCount}</span>
          <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}> / {totalMembers}</span>{" "}
          au pus cel puțin un pronostic
          <span className="ml-1 font-semibold" style={{ color: "#C084FC" }}>({pct}%)</span>
        </p>
      </div>
    </div>
  );
}
