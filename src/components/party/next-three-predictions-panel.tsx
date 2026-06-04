"use client";

export type NextThreeMatchPreds = {
  matchId: number;
  fixture: string;
  kickoff: string;
  rows: { userId: string; displayName: string; pred: string }[];
};

export function NextThreePredictionsPanel({
  matches,
  currentUserId,
}: {
  matches: NextThreeMatchPreds[];
  currentUserId: string;
}) {
  if (matches.length === 0) return null;

  return (
    <section
      className="rounded-2xl border p-4 flex flex-col gap-4"
      style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#1E293B" }}
    >
      <h3 className="text-white font-semibold text-sm">
        Următoarele 3 meciuri — pronosticuri grupă
      </h3>
      {matches.map((block) => (
        <div key={block.matchId} className="flex flex-col gap-2">
          <div className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
            <span className="text-white font-medium">{block.fixture}</span>
            <span className="mx-2">·</span>
            {block.kickoff}
          </div>
          <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <th
                    className="text-left py-2 px-3 text-xs font-medium"
                    style={{ color: "rgba(255,255,255,0.45)" }}
                  >
                    Membru
                  </th>
                  <th
                    className="text-left py-2 px-3 text-xs font-medium"
                    style={{ color: "rgba(255,255,255,0.45)" }}
                  >
                    Pronostic
                  </th>
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row) => (
                  <tr
                    key={row.userId}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      backgroundColor:
                        row.userId === currentUserId ? "rgba(34,211,238,0.06)" : "transparent",
                    }}
                  >
                    <td
                      className="py-2 px-3 whitespace-nowrap"
                      style={{
                        color: row.userId === currentUserId ? "#22D3EE" : "#fff",
                      }}
                    >
                      {row.displayName}
                    </td>
                    <td className="py-2 px-3 font-mono text-xs" style={{ color: "rgba(255,255,255,0.85)" }}>
                      {row.pred || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </section>
  );
}
