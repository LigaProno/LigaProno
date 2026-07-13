"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useLocale } from "@/components/i18n/locale-provider";
import { submitTriviaAnswer } from "@/app/actions/mini-games";
import type { TriviaQuestion } from "@/lib/mini-games/types";

type Phase = "question" | "story" | "done";

export default function TriviaGame({
  questions,
  initialAnswers,
  initialScore,
  initialCompleted,
}: {
  questions: TriviaQuestion[];
  initialAnswers: number[];
  initialScore: number;
  initialCompleted: boolean;
}) {
  const { locale, t } = useLocale();
  const [answers, setAnswers] = useState(initialAnswers);
  const [score, setScore] = useState(initialScore);
  const [completed, setCompleted] = useState(initialCompleted);
  const [phase, setPhase] = useState<Phase>(initialCompleted ? "done" : "question");
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [pending, startTransition] = useTransition();

  // Indexul întrebării afișate — rămâne fix în faza „poveste” după ce utilizatorul răspunde.
  const [displayIndex, setDisplayIndex] = useState(() => {
    if (initialCompleted) return Math.max(0, questions.length - 1);
    const firstOpen = initialAnswers.findIndex((a) => a === -1);
    return firstOpen === -1 ? Math.max(0, questions.length - 1) : firstOpen;
  });

  const question = questions[displayIndex];

  function handleAnswer(selectedIndex: number) {
    if (pending || completed || phase !== "question") return;
    const indexAnswered = displayIndex;
    startTransition(async () => {
      const result = await submitTriviaAnswer(indexAnswered, selectedIndex);
      setLastCorrect(result.correct);
      setAnswers((prev) => {
        const next = [...prev];
        next[indexAnswered] = selectedIndex;
        return next;
      });
      setScore(result.triviaScore);
      setCompleted(result.completed);
      setPhase("story");
    });
  }

  function handleNext() {
    if (completed && phase === "story") {
      setPhase("done");
      return;
    }
    const nextUnanswered = answers.findIndex((a) => a === -1);
    if (nextUnanswered === -1) {
      setCompleted(true);
      setPhase("done");
    } else {
      setDisplayIndex(nextUnanswered);
      setPhase("question");
      setLastCorrect(null);
    }
  }

  if (!question) {
    return null;
  }

  const progress = answers.filter((a) => a !== -1).length;

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

      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">{t("miniGames.trivia.title")}</h1>
        <span className="text-sm tabular-nums" style={{ color: "rgba(255,255,255,0.45)" }}>
          {progress}/{questions.length} · {score} {t("miniGames.points")}
        </span>
      </div>

      <div
        className="rounded-2xl border p-6"
        style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.08)" }}
      >
        {phase === "done" ? (
          <div className="text-center py-4">
            <p className="text-3xl font-bold text-cyan-300 mb-2">
              {score}/{questions.length + 2}
            </p>
            <p className="text-white/70 mb-6">{t("miniGames.trivia.finished")}</p>
            <Link
              href="/mini-jocuri"
              className="inline-block px-5 py-2.5 rounded-xl font-medium text-sm"
              style={{ backgroundColor: "#3B82F6", color: "#0A0B1E" }}
            >
              {t("miniGames.backToHub")}
            </Link>
          </div>
        ) : (
          <>
            <p className="text-xs uppercase tracking-wide mb-3" style={{ color: "#3B82F6" }}>
              {t("miniGames.trivia.question")} {displayIndex + 1}/{questions.length}
            </p>
            <h2 className="text-lg font-semibold text-white mb-6 leading-snug">
              {question.question[locale]}
            </h2>

            {phase === "question" && (
              <div className="grid gap-2">
                {question.options[locale].map((opt, i) => (
                  <button
                    key={`${displayIndex}-${i}`}
                    type="button"
                    disabled={pending}
                    onClick={() => handleAnswer(i)}
                    className="text-left px-4 py-3 rounded-xl border transition-all cursor-pointer hover:border-cyan-400/40 disabled:opacity-50"
                    style={{
                      borderColor: "rgba(255,255,255,0.1)",
                      backgroundColor: "rgba(255,255,255,0.03)",
                      color: "white",
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {phase === "story" && (
              <div>
                <div
                  className="rounded-xl px-4 py-3 mb-4 text-sm font-medium"
                  style={{
                    backgroundColor: lastCorrect
                      ? "rgba(34,197,94,0.12)"
                      : "rgba(248,113,113,0.12)",
                    color: lastCorrect ? "#86efac" : "#fca5a5",
                  }}
                >
                  {lastCorrect ? t("miniGames.correct") : t("miniGames.incorrect")}
                  {!lastCorrect && (
                    <span className="block mt-1 font-normal text-white/70">
                      {t("miniGames.correctAnswer")}: {question.options[locale][question.correctIndex]}
                    </span>
                  )}
                </div>
                <div
                  className="rounded-xl border px-4 py-4 mb-6"
                  style={{ borderColor: "rgba(59,130,246,0.2)", backgroundColor: "rgba(59,130,246,0.05)" }}
                >
                  <p className="text-xs font-semibold uppercase mb-2 text-cyan-300">
                    {t("miniGames.trivia.story")}
                  </p>
                  <p className="text-sm leading-relaxed text-white/85">{question.story[locale]}</p>
                </div>
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full py-3 rounded-xl font-medium text-sm cursor-pointer"
                  style={{ backgroundColor: "#3B82F6", color: "#0A0B1E" }}
                >
                  {completed && displayIndex === questions.length - 1
                    ? t("miniGames.trivia.seeResults")
                    : t("miniGames.trivia.next")}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
