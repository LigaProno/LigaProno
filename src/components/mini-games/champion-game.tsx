"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/i18n/locale-provider";
import { submitChampionGuess } from "@/app/actions/mini-games";
import { searchChampions } from "@/lib/mini-games/daily";
import ChampionPixelImage from "@/components/mini-games/champion-pixel-image";
import ChampionCluesPanel from "@/components/mini-games/champion-clues-panel";
import ChampionGuessFeedback from "@/components/mini-games/champion-guess-feedback";
import type { ChampionReveal } from "@/lib/mini-games/champion-clues";
import type { ChampionPlayer } from "@/lib/mini-games/types";

type GuessFeedback = {
  countryMatch: boolean;
  positionMatch: boolean;
  solved: boolean;
  failed: boolean;
};

export default function ChampionGame({
  playerImageUrl,
  reveals,
  revealedPlayer,
  initialGuesses,
  initialSolved,
  initialScore,
}: {
  playerImageUrl: string;
  reveals: ChampionReveal[];
  revealedPlayer: ChampionPlayer | null;
  initialGuesses: string[];
  initialSolved: boolean;
  initialScore: number;
}) {
  const { locale, t } = useLocale();
  const router = useRouter();
  const [guesses, setGuesses] = useState(initialGuesses);
  const [solved, setSolved] = useState(initialSolved);
  const [score, setScore] = useState(initialScore);
  const [feedback, setFeedback] = useState<GuessFeedback | null>(null);

  useEffect(() => {
    setGuesses(initialGuesses);
    setSolved(initialSolved);
    setScore(initialScore);
  }, [initialGuesses, initialSolved, initialScore]);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ChampionPlayer[]>([]);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const attempts = guesses.length;
  const maxAttempts = 6;
  const gameOver = solved || attempts >= maxAttempts;

  useEffect(() => {
    setSuggestions(searchChampions(query));
  }, [query]);

  function submit(name: string) {
    if (pending || gameOver || !name.trim()) return;
    startTransition(async () => {
      const result = await submitChampionGuess(name);
      setGuesses((g) => [...g, name]);
      setQuery("");
      setSuggestions([]);

      const failed = !result.solved && result.attempts >= maxAttempts;
      setFeedback({
        countryMatch: result.countryMatch,
        positionMatch: result.positionMatch,
        solved: result.solved,
        failed,
      });

      if (result.solved) {
        setSolved(true);
        setScore(result.championScore);
      }

      router.refresh();
    });
  }

  const displayPlayer = revealedPlayer && (solved || gameOver) ? revealedPlayer : null;
  const showFeedback = feedback !== null || solved || gameOver;

  return (
    <div className="max-w-2xl mx-auto">
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
        <h1 className="text-2xl font-bold text-white">{t("miniGames.champion.title")}</h1>
        <span className="text-sm text-white/45">
          {attempts}/{maxAttempts}
        </span>
      </div>

      <div
        className="rounded-2xl border p-6"
        style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.08)" }}
      >
        <div className="flex justify-center mb-6">
          <ChampionPixelImage
            src={playerImageUrl}
            attempts={attempts}
            solved={solved}
            alt={displayPlayer?.name ?? ""}
          />
        </div>

        <p className="text-center text-sm text-white/50 mb-4">{t("miniGames.champion.hint")}</p>

        <ChampionCluesPanel reveals={reveals} />

        {showFeedback && (
          <ChampionGuessFeedback
            countryMatch={feedback?.countryMatch ?? false}
            positionMatch={feedback?.positionMatch ?? false}
            solved={solved}
            failed={gameOver && !solved}
            visible
          />
        )}

        {displayPlayer && (
          <div
            className="rounded-xl border px-4 py-4 mb-4 text-center"
            style={{ borderColor: "rgba(59,130,246,0.2)", backgroundColor: "rgba(59,130,246,0.05)" }}
          >
            <p className="text-lg font-bold text-white mb-1">{displayPlayer.name}</p>
            <p className="text-sm text-white/70">{displayPlayer.fact[locale]}</p>
            {score > 0 && (
              <p className="text-cyan-300 font-semibold mt-2">
                +{score} {t("miniGames.points")}
              </p>
            )}
          </div>
        )}

        {!gameOver && (
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && suggestions[0]) submit(suggestions[0].name);
              }}
              placeholder={t("miniGames.champion.placeholder")}
              className="w-full px-4 py-3 rounded-xl border text-white text-sm outline-none focus:border-blue-500/50"
              style={{
                borderColor: "rgba(255,255,255,0.12)",
                backgroundColor: "rgba(255,255,255,0.04)",
              }}
              disabled={pending}
            />
            {suggestions.length > 0 && query.trim() && (
              <ul
                className="absolute z-10 left-0 right-0 mt-1 rounded-xl border overflow-hidden shadow-xl"
                style={{ borderColor: "rgba(255,255,255,0.1)", backgroundColor: "#0A0B1E" }}
              >
                {suggestions.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-white/5 cursor-pointer"
                      onClick={() => submit(p.name)}
                    >
                      {p.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {gameOver && (
          <Link
            href="/mini-jocuri"
            className="block text-center mt-4 py-3 rounded-xl font-medium text-sm"
            style={{ backgroundColor: "#3B82F6", color: "#0A0B1E" }}
          >
            {t("miniGames.backToHub")}
          </Link>
        )}
      </div>
    </div>
  );
}
