import { SupportCategory, SupportStatus } from "@prisma/client";

export const SUPPORT_CATEGORY_LABEL: Record<SupportCategory, string> = {
  BUG: "Raport bug",
  QUESTION: "Întrebare",
  SUGGESTION: "Sugestie",
  OTHER: "Altele",
};

export const SUPPORT_CATEGORY_COLOR: Record<SupportCategory, string> = {
  BUG: "#F87171",
  QUESTION: "#60A5FA",
  SUGGESTION: "#C084FC",
  OTHER: "rgba(255,255,255,0.55)",
};

type StatusMeta = { label: string; color: string; bg: string };

/** Etichetele pe care le vede și userul: Nou → În lucru → Rezolvat. */
export const SUPPORT_STATUS_META: Record<SupportStatus, StatusMeta> = {
  OPEN: { label: "Nou", color: "#F87171", bg: "rgba(248,113,113,0.14)" },
  SEEN: { label: "În lucru", color: "#FBBF24", bg: "rgba(251,191,36,0.14)" },
  DONE: { label: "Rezolvat", color: "#34D399", bg: "rgba(52,211,153,0.14)" },
};
