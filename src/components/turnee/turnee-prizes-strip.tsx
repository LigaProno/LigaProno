import { formatPrizesDisplay, type TournamentPrize } from "@/lib/tournament-prizes";

export function TurneePrizesStrip({ prizes }: { prizes: TournamentPrize[] }) {
  const text = formatPrizesDisplay(prizes);
  if (!text) return null;

  return (
    <div
      className="px-4 py-2.5 border-b"
      style={{
        borderColor: "rgba(197,160,89,0.18)",
        background: "linear-gradient(90deg, rgba(197,160,89,0.12) 0%, rgba(197,160,89,0.03) 100%)",
      }}
    >
      <p className="text-xs sm:text-sm leading-snug truncate" style={{ color: "rgba(255,255,255,0.78)" }}>
        <span className="font-bold" style={{ color: "#C5A059" }}>
          Premii:
        </span>{" "}
        {text}
      </p>
    </div>
  );
}
