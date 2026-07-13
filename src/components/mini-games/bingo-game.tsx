"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useLocale } from "@/components/i18n/locale-provider";
import { submitBingoCell } from "@/app/actions/mini-games";
import { searchChampions } from "@/lib/mini-games/daily";
import { CHAMPION_PLAYERS } from "@/data/mini-games/champions";
import type { BingoCriterion, BingoCells, ChampionPlayer } from "@/lib/mini-games/types";

export default function BingoGame({
  criteria,
  initialCells,
  initialMoves,
  initialScore,
  initialLineComplete,
  initialFullHouse,
}: {
  criteria: BingoCriterion[];
  initialCells: BingoCells;
  initialMoves: number;
  initialScore: number;
  initialLineComplete: boolean;
  initialFullHouse: boolean;
}) {
  const { locale, t } = useLocale();
  const [cells, setCells] = useState(initialCells);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ChampionPlayer[]>([]);
  const [moves, setMoves] = useState(initialMoves);
  const [score, setScore] = useState(initialScore);
  const [lineComplete, setLineComplete] = useState(initialLineComplete);
  const [fullHouse, setFullHouse] = useState(initialFullHouse);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const playerById = new Map(CHAMPION_PLAYERS.map((p) => [p.id, p]));

  useEffect(() => {
    setSuggestions(searchChampions(query));
  }, [query]);

  function handleCellClick(index: number) {
    if (cells[String(index)]) return;
    setSelectedCell(index);
    setQuery("");
    setFeedback(null);
  }

  function submitPlayer(player: ChampionPlayer) {
    if (selectedCell === null || pending) return;
    const cell = selectedCell;
    startTransition(async () => {
      const result = await submitBingoCell(cell, player.name);
      setMoves((m) => m + 1);
      setScore(result.bingoScore);
      setLineComplete(result.lineComplete);
      setFullHouse(result.fullHouse);
      if (result.valid) {
        setCells((c) => ({ ...c, [String(cell)]: player.id }));
        setFeedback("valid");
        setSelectedCell(null);
        setQuery("");
      } else {
        setFeedback("invalid");
      }
    });
  }

  return (
    <div className="max-w-lg mx-auto">
      <Link
        href="/mini-jocuri"
        className="inline-flex items-center gap-2 text-sm mb-6 hover:opacity-80"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        {t("miniGames.back")}
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{t("miniGames.bingo.title")}</h1>
        <span className="text-sm text-white/45">
          {moves} {t("miniGames.bingo.moves")} · {score} {t("miniGames.points")}
        </span>
      </div>

      {(lineComplete || fullHouse) && (
        <p className="text-sm text-center text-emerald-300 mb-4">
          {fullHouse ? t("miniGames.bingo.fullHouse") : t("miniGames.bingo.lineComplete")}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2 mb-6">
        {criteria.map((c, i) => {
          const playerId = cells[String(i)];
          const player = playerId ? playerById.get(playerId) : null;
          const filled = Boolean(player);
          const isSelected = selectedCell === i;

          return (
            <button
              key={c.id}
              type="button"
              onClick={() => handleCellClick(i)}
              className="aspect-square p-2 rounded-xl border text-center flex flex-col items-center justify-center gap-1 transition-all cursor-pointer"
              style={{
                borderColor: isSelected
                  ? "rgba(59,130,246,0.6)"
                  : filled
                    ? "rgba(34,197,94,0.4)"
                    : "rgba(255,255,255,0.1)",
                backgroundColor: filled
                  ? "rgba(34,197,94,0.1)"
                  : isSelected
                    ? "rgba(59,130,246,0.08)"
                    : "rgba(255,255,255,0.03)",
              }}
            >
              {filled ? (
                <span className="text-xs font-semibold text-emerald-300 leading-tight">
                  {player?.name.split(" ").pop()}
                </span>
              ) : (
                <span className="text-[10px] sm:text-xs leading-tight text-white/70">
                  {c.label[locale]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selectedCell !== null && (
        <div
          className="rounded-2xl border p-4"
          style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.08)" }}
        >
          <p className="text-xs text-cyan-300 mb-2">{criteria[selectedCell].label[locale]}</p>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("miniGames.champion.placeholder")}
            className="w-full px-4 py-3 rounded-xl border text-white text-sm outline-none mb-2"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              backgroundColor: "rgba(255,255,255,0.04)",
            }}
            disabled={pending}
          />
          {feedback && (
            <p
              className="text-xs mb-2"
              style={{ color: feedback === "valid" ? "#86efac" : "#fca5a5" }}
            >
              {feedback === "valid" ? t("miniGames.bingo.valid") : t("miniGames.bingo.invalid")}
            </p>
          )}
          {suggestions.length > 0 && query.trim() && (
            <ul className="rounded-xl border overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
              {suggestions.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/5 cursor-pointer"
                    onClick={() => submitPlayer(p)}
                  >
                    {p.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
