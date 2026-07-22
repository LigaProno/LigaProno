type AllocationRow = {
  rank: number;
  name: string;
  total: number;
  shirt: string;
  fromPref: boolean;
};

type PrefRow = { rank: number; name: string; preference: string[] };

/**
 * Vizibil doar organizatorului (creator/admin). Repartizare sugerată în ordinea
 * clasamentului (fiecare finisher primește primul premiu preferat încă disponibil)
 * + lista completă cu preferințele tuturor.
 */
export function PrizeAllocationView({
  allocation,
  allPrefs,
  finished,
}: {
  allocation: AllocationRow[];
  allPrefs: PrefRow[];
  finished: boolean;
}) {
  return (
    <div
      className="mb-6 rounded-2xl border p-4 sm:p-5 flex flex-col gap-4"
      style={{ borderColor: "rgba(59,130,246,0.3)", backgroundColor: "rgba(59,130,246,0.06)" }}
    >
      <div className="flex flex-col gap-0.5">
        <h2 className="text-base font-bold text-white">🎁 Repartizare premii (doar tu vezi asta)</h2>
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
          {finished
            ? "Clasament final. Fiecare primește primul premiu preferat încă disponibil."
            : "Pe baza clasamentului curent (nefinal). Fiecare primește primul premiu preferat încă disponibil."}
        </p>
      </div>

      {/* Repartizare sugerată */}
      <div className="flex flex-col gap-2">
        {allocation.map((a) => (
          <div
            key={a.rank}
            className="flex items-center gap-3 rounded-xl border px-3 py-2.5"
            style={{ borderColor: "rgba(197,160,89,0.28)", backgroundColor: "rgba(197,160,89,0.07)" }}
          >
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0"
              style={{ backgroundColor: "rgba(197,160,89,0.2)", color: "#C5A059" }}
            >
              {a.rank}
            </span>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-semibold text-white truncate">{a.name}</span>
              <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                {a.total} pct
              </span>
            </div>
            <div className="flex flex-col items-end shrink-0">
              <span className="text-sm font-bold" style={{ color: "#C5A059" }}>
                {a.shirt}
              </span>
              {!a.fromPref ? (
                <span className="text-[10px]" style={{ color: "#F87171" }}>
                  fără preferință — verifică manual
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {/* Toate preferințele */}
      <details className="group">
        <summary className="text-xs font-semibold cursor-pointer select-none" style={{ color: "rgba(255,255,255,0.6)" }}>
          Toate preferințele ({allPrefs.length})
        </summary>
        <div className="mt-2 flex flex-col gap-1 max-h-72 overflow-y-auto pr-1">
          {allPrefs.map((p) => (
            <div key={`${p.rank}-${p.name}`} className="flex items-center gap-2 text-xs py-1" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <span className="w-6 tabular-nums shrink-0" style={{ color: "rgba(255,255,255,0.35)" }}>
                {p.rank}
              </span>
              <span className="w-32 sm:w-40 truncate text-white/85 shrink-0">{p.name}</span>
              <span className="min-w-0 truncate" style={{ color: "rgba(255,255,255,0.5)" }}>
                {p.preference.length > 0
                  ? p.preference.map((s, i) => `${i + 1}. ${s}`).join("  ·  ")
                  : "— nesetat —"}
              </span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
