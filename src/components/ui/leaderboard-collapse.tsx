"use client";

import { useLocale } from "@/components/i18n/locale-provider";

/** Rândul-punte care înlocuiește jucătorii ascunși; click pe el deschide tot. */
export function LeaderboardGapRow({
  colSpan,
  hiddenCount,
  onExpand,
}: {
  colSpan: number;
  hiddenCount: number;
  onExpand: () => void;
}) {
  const { t } = useLocale();

  return (
    <tr>
      <td colSpan={colSpan} className="p-0">
        <button
          type="button"
          onClick={onExpand}
          className="w-full py-2 text-center text-[11px] tracking-wide transition-colors hover:bg-white/[0.03]"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          ··· {t("party.lb.hiddenCount", { count: hiddenCount })} ···
        </button>
      </td>
    </tr>
  );
}

export function LeaderboardToggle({
  showAll,
  totalCount,
  onToggle,
}: {
  showAll: boolean;
  totalCount: number;
  onToggle: () => void;
}) {
  const { t } = useLocale();

  return (
    <button
      type="button"
      onClick={onToggle}
      className="self-center rounded-full border px-4 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/[0.06]"
      style={{ borderColor: "rgba(255,255,255,0.14)" }}
    >
      {showAll ? t("party.lb.showLess") : t("party.lb.showAll", { count: totalCount })}
    </button>
  );
}
