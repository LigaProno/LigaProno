import Link from "next/link";
import DeleteTournamentButton from "@/components/turnee/delete-tournament-button";
import { TurneeMetaChip, TurneePanel } from "@/components/turnee/turnee-ui";

type TurneeMyTournamentCardProps = {
  id: string;
  name: string;
  memberCount: number;
  inviteCode: string;
  competitionLabel: string | null;
  isOwner: boolean;
  createdByText: string;
  openLabel: string;
};

export function TurneeMyTournamentCard({
  id,
  name,
  memberCount,
  inviteCode,
  competitionLabel,
  isOwner,
  createdByText,
  openLabel,
}: TurneeMyTournamentCardProps) {
  return (
    <TurneePanel className="p-0 overflow-hidden transition-transform hover:-translate-y-0.5">
      <div className="px-4 py-4 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-base font-bold text-white truncate">{name}</h3>
            {competitionLabel ? <TurneeMetaChip tone="gold">{competitionLabel}</TurneeMetaChip> : null}
          </div>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.38)" }}>
            {createdByText}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap shrink-0">
          <TurneeMetaChip>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
            {memberCount}
          </TurneeMetaChip>

          <TurneeMetaChip tone="code">
            <span className="font-mono tracking-[0.18em] text-[11px]">{inviteCode}</span>
          </TurneeMetaChip>

          <Link href={`/turnee/${id}`} className="turnee-btn-primary shrink-0">
            {openLabel}
          </Link>

          {isOwner ? <DeleteTournamentButton tournamentId={id} /> : null}
        </div>
      </div>
    </TurneePanel>
  );
}
