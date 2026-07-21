import Link from "next/link";
import JoinPublicTournamentButton from "@/components/turnee/join-public-tournament-button";
import LeaveTournamentButton from "@/components/turnee/leave-tournament-button";
import { PublicTournamentPrizeNotice } from "@/components/turnee/public-tournament-prize-notice";
import { TurneePrizesStrip } from "@/components/turnee/turnee-prizes-strip";
import { TurneeMetaChip, TurneePanel } from "@/components/turnee/turnee-ui";
import { parsePrizes } from "@/lib/tournament-prizes";

type TurneePublicTournamentCardProps = {
  id: string;
  name: string;
  memberCount: number;
  prizesRaw: unknown;
  isJoined: boolean;
  openLabel: string;
  isFinished?: boolean;
  finishedLabel?: string;
};

export function TurneePublicTournamentCard({
  id,
  name,
  memberCount,
  prizesRaw,
  isJoined,
  openLabel,
  isFinished = false,
  finishedLabel,
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
          <h3 className="text-base font-bold text-white truncate">{name}</h3>
          {hasPrizes ? (
            <div className="mt-2">
              <PublicTournamentPrizeNotice />
            </div>
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
          {/* Turneu încheiat: doar vizualizare — fără înscriere sau ieșire. */}
          {isFinished ? (
            isJoined ? (
              <Link href={`/turnee/${id}`} className="turnee-btn-primary shrink-0">
                {openLabel}
              </Link>
            ) : (
              <TurneeMetaChip>{finishedLabel}</TurneeMetaChip>
            )
          ) : isJoined ? (
            <>
              <Link href={`/turnee/${id}`} className="turnee-btn-primary shrink-0">
                {openLabel}
              </Link>
              <LeaveTournamentButton tournamentId={id} tournamentName={name} isPublic />
            </>
          ) : (
            <JoinPublicTournamentButton tournamentId={id} />
          )}
        </div>
      </div>
    </TurneePanel>
  );
}
