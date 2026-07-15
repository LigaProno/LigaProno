"use client";

import { useLocale } from "@/components/i18n/locale-provider";
import { ProfileButton } from "@/components/profile/profile-ui";

export function FavoriteTeamDisplay({
  teamName,
  teamCrest,
  competitionLabel,
  onEdit,
}: {
  teamName: string;
  teamCrest: string | null;
  competitionLabel: string;
  onEdit: () => void;
}) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div
        className="flex items-center gap-4 rounded-xl border px-4 py-4"
        style={{
          borderColor: "rgba(197,160,89,0.35)",
          backgroundColor: "rgba(197,160,89,0.08)",
        }}
      >
        {teamCrest ?
          // eslint-disable-next-line @next/next/no-img-element
          <img src={teamCrest} alt="" className="h-14 w-14 shrink-0 object-contain" />
        : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lg font-bold text-white/60">
            {teamName.slice(0, 2).toUpperCase()}
          </span>
        }
        <div>
          <p className="text-lg font-semibold text-white">{teamName}</p>
          <p className="mt-0.5 text-sm text-white/50">{competitionLabel}</p>
        </div>
      </div>
      <ProfileButton variant="ghost" onClick={onEdit}>
        {t("profile.favoriteTeam.edit")}
      </ProfileButton>
    </div>
  );
}
