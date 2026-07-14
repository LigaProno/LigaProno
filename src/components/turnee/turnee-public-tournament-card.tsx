import JoinPublicTournamentButton from "@/components/turnee/join-public-tournament-button";
import { TurneePrizesStrip } from "@/components/turnee/turnee-prizes-strip";
import { TurneeMetaChip, TurneePanel } from "@/components/turnee/turnee-ui";
import { parsePrizes } from "@/lib/tournament-prizes";

type TurneePublicTournamentCardProps = {
  id: string;
  name: string;
  competitionLabel: string | null;
  memberCount: number;
  prizesRaw: unknown;
};

export function TurneePublicTournamentCard({
  id,
  name,
  competitionLabel,
  memberCount,
  prizesRaw,
}: TurneePublicTournamentCardProps) {
  const prizes = parsePrizes(prizesRaw);
  const hasPrizes = prizes.length > 0;

  return (
    <TurneePanel
      className="p-0 overflow-hidden transition-transform hover:-translate-y-0.5"
      style={hasPrizes ? { borderColor: "rgba(197,160,89,0.28)" } : undefined}
    >
      {hasPrizes ? <TurneePrizesStrip prizes={prizes} /> : null}

      <div className="px-4 py-4 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-base font-bold text-white truncate">{name}</h3>
            <TurneeMetaChip tone="gold">Public</TurneeMetaChip>
          </div>
          {competitionLabel ? (
            <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.38)" }}>
              {competitionLabel}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <TurneeMetaChip>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
            {memberCount}
          </TurneeMetaChip>
          <JoinPublicTournamentButton tournamentId={id} />
        </div>
      </div>
    </TurneePanel>
  );
}
