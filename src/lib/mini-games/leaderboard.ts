import { prisma } from "@/lib/prisma";
import { todayDateKeyBucharest, weekDateKeysContaining } from "./date";
import type { MiniGameLeaderboardPeriod, MiniGameLeaderboardRow } from "./types";

function displayName(first?: string | null, last?: string | null): string {
  const s = `${first ?? ""} ${last ?? ""}`.trim();
  return s.length > 0 ? s : "Jucător";
}

type AggRow = {
  userId: string;
  triviaScore: number;
  championScore: number;
  bingoScore: number;
  totalScore: number;
};

async function aggregateByUser(dateKeys: string[]): Promise<AggRow[]> {
  const plays = await prisma.miniGamePlay.findMany({
    where: { dateKey: { in: dateKeys } },
    select: {
      userId: true,
      triviaScore: true,
      championScore: true,
      bingoScore: true,
      totalScore: true,
    },
  });

  const byUser = new Map<string, AggRow>();
  for (const p of plays) {
    const prev = byUser.get(p.userId);
    if (!prev) {
      byUser.set(p.userId, { ...p });
    } else {
      prev.triviaScore += p.triviaScore;
      prev.championScore += p.championScore;
      prev.bingoScore += p.bingoScore;
      prev.totalScore += p.totalScore;
    }
  }

  return [...byUser.values()].sort((a, b) => b.totalScore - a.totalScore);
}

export async function buildMiniGameLeaderboard(
  period: MiniGameLeaderboardPeriod,
  dateKey: string = todayDateKeyBucharest(),
): Promise<MiniGameLeaderboardRow[]> {
  let dateKeys: string[];
  if (period === "today") {
    dateKeys = [dateKey];
  } else if (period === "week") {
    dateKeys = weekDateKeysContaining(dateKey);
  } else {
    const distinct = await prisma.miniGamePlay.findMany({
      select: { dateKey: true },
      distinct: ["dateKey"],
    });
    dateKeys = distinct.map((d) => d.dateKey);
    if (dateKeys.length === 0) return [];
  }

  const agg = await aggregateByUser(dateKeys);
  if (agg.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: agg.map((a) => a.userId) } },
    select: { id: true, firstName: true, lastName: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return agg.map((row, i) => {
    const u = userMap.get(row.userId);
    return {
      rank: i + 1,
      userId: row.userId,
      displayName: displayName(u?.firstName, u?.lastName),
      triviaScore: row.triviaScore,
      championScore: row.championScore,
      bingoScore: row.bingoScore,
      totalScore: row.totalScore,
    };
  });
}

export async function getOrCreatePlay(userId: string, dateKey: string) {
  const existing = await prisma.miniGamePlay.findUnique({
    where: { userId_dateKey: { userId, dateKey } },
  });
  if (existing) return existing;

  return prisma.miniGamePlay.create({
    data: {
      userId,
      dateKey,
      triviaAnswers: Array(10).fill(-1),
      championGuesses: [],
    },
  });
}

export async function computeTriviaStreak(userId: string, dateKey: string): Promise<number> {
  const plays = await prisma.miniGamePlay.findMany({
    where: { userId, triviaCompleted: true },
    orderBy: { dateKey: "desc" },
    take: 60,
    select: { dateKey: true, triviaScore: true },
  });

  let streak = 0;
  let cursor = dateKey;

  for (const play of plays) {
    if (play.dateKey !== cursor) break;
    const correct = Math.min(play.triviaScore, 10);
    if (correct < 7) break;
    streak++;
    const [y, m, d] = cursor.split("-").map(Number);
    const prev = new Date(Date.UTC(y, m - 1, d - 1, 12, 0, 0));
    const py = prev.getUTCFullYear();
    const pm = String(prev.getUTCMonth() + 1).padStart(2, "0");
    const pd = String(prev.getUTCDate()).padStart(2, "0");
    cursor = `${py}-${pm}-${pd}`;
  }

  return streak;
}
