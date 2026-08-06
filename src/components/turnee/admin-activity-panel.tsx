/**
 * Vizibil DOAR adminilor. Câți membri au pus efectiv cel puțin un pronostic
 * (useri activi) din total membri + cine anume. Contorul de membri nu mai e
 * relevant de când turneele publice înscriu automat pe toată lumea.
 */
export function AdminActivityPanel({
  activeNames,
  inactiveNames,
}: {
  activeNames: string[];
  inactiveNames: string[];
}) {
  const active = activeNames.length;
  const total = active + inactiveNames.length;
  const pct = total > 0 ? Math.round((active / total) * 100) : 0;

  return (
    <div
      className="mb-6 rounded-2xl border p-4 sm:p-5 flex flex-col gap-4"
      style={{ borderColor: "rgba(168,85,247,0.35)", backgroundColor: "rgba(168,85,247,0.07)" }}
    >
      <div className="flex items-center gap-4">
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
            <span className="text-lg font-extrabold text-white">{active}</span>
            <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}> / {total}</span>{" "}
            au pus cel puțin un pronostic
            <span className="ml-1 font-semibold" style={{ color: "#C084FC" }}>({pct}%)</span>
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <NameList
          title={`Au pus (${active})`}
          names={activeNames}
          color="#34D399"
          emptyText="Nimeni încă."
        />
        <NameList
          title={`N-au pus (${inactiveNames.length})`}
          names={inactiveNames}
          color="#F87171"
          emptyText="Toți au pus."
        />
      </div>
    </div>
  );
}

function NameList({
  title,
  names,
  color,
  emptyText,
}: {
  title: string;
  names: string[];
  color: string;
  emptyText: string;
}) {
  return (
    <details className="group flex-1 min-w-0">
      <summary
        className="text-xs font-semibold cursor-pointer select-none flex items-center gap-1.5"
        style={{ color }}
      >
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        {title}
      </summary>
      {names.length === 0 ? (
        <p className="mt-2 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{emptyText}</p>
      ) : (
        <div className="mt-2 flex flex-col gap-0.5 max-h-64 overflow-y-auto pr-1">
          {names.map((name, i) => (
            <div
              key={`${i}-${name}`}
              className="text-xs py-1 truncate"
              style={{ color: "rgba(255,255,255,0.8)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
            >
              {name}
            </div>
          ))}
        </div>
      )}
    </details>
  );
}
