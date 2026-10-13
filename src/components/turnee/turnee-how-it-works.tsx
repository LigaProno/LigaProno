"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";
import { COMPETITION_PICKER_OPTIONS } from "@/lib/competition";
import { getLeaderboardRowStyle, getPodiumStyle } from "@/lib/leaderboard-podium";
import {
  WC_BORDER,
  WC_CARD_GRADIENT,
  WC_CYAN,
  WC_LIME,
  WC_MUTED,
  WC_NAVY,
  WC_TOP_BORDER_GRADIENT,
} from "@/components/world-cup/wc-theme";

const STEP_NUMBERS = ["01", "02", "03"] as const;
const SCENES = ["create", "code", "predict", "board"] as const;
type SceneId = (typeof SCENES)[number];

const SCENE_MS: Record<SceneId, number> = {
  create: 8200,
  code: 3800,
  predict: 6400,
  board: 4600,
};

const DEMO_CODE = "K7M2QX9PLA";
const PICKED_KEY = "CL_2026";
const MENU_KEYS = ["PL_2026", "PD_2026", PICKED_KEY] as const;

const OUTCOMES = [
  { val: "HOME", label: "1" },
  { val: "DRAW", label: "X" },
  { val: "AWAY", label: "2" },
] as const;

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function seg(p: number, start: number, end: number) {
  return clamp01((p - start) / (end - start));
}

function nextScene(id: SceneId): SceneId {
  return SCENES[(SCENES.indexOf(id) + 1) % SCENES.length];
}

function sceneForStep(index: number): SceneId {
  if (index <= 0) return "create";
  if (index === 1) return "code";
  return "predict";
}

function stepForScene(scene: SceneId) {
  if (scene === "create") return 0;
  if (scene === "code") return 1;
  return 2;
}

/** Cheie discretă: React se redesenează doar când se schimbă un pas vizibil, nu la fiecare cadru. */
function visualKey(scene: SceneId, elapsed: number, nameLength: number) {
  const p = clamp01(elapsed / SCENE_MS[scene]);
  const bar = Math.floor(p * 16);
  if (scene === "create") {
    const chars = Math.round(seg(p, 0.08, 0.46) * nameLength);
    const menu = p < 0.56 ? 0 : p < 0.66 ? 1 : p < 0.76 ? 2 : 3;
    const press = p >= 0.86 && p < 0.93 ? 1 : 0;
    return `c${bar}|${chars}|${menu}|${press}`;
  }
  if (scene === "code") {
    const copied = p >= 0.58 ? 1 : 0;
    const press = p >= 0.5 && p < 0.62 ? 1 : 0;
    return `k${bar}|${copied}|${press}|${p < 0.42 ? 0 : 1}`;
  }
  if (scene === "predict") {
    return `p${bar}|${p >= 0.32 ? 1 : 0}${p >= 0.48 ? 1 : 0}${p >= 0.62 ? 1 : 0}${p >= 0.84 ? 1 : 0}${p >= 0.76 && p < 0.84 ? 1 : 0}`;
  }
  const points = [18, 14, 11];
  const rows = points
    .map((pts, i) => {
      const shown = p >= 0.08 + i * 0.12 ? 1 : 0;
      const value = Math.round(pts * seg(p, 0.2 + i * 0.08, 0.55 + i * 0.08));
      return `${shown}${value}`;
    })
    .join("");
  return `b${bar}|${rows}`;
}

type CursorPose = { x: number; y: number; down: boolean };

function cursorPose(scene: SceneId, p: number): CursorPose {
  if (scene === "create") {
    if (p < 0.08) return { x: 72, y: 16, down: false };
    if (p < 0.5) return { x: 42, y: 30, down: false };
    if (p < 0.58) return { x: 58, y: 48, down: p > 0.54 };
    if (p < 0.66) return { x: 40, y: 60, down: false };
    if (p < 0.76) return { x: 55, y: 74, down: p > 0.72 };
    return { x: 46, y: 90, down: p > 0.86 && p < 0.93 };
  }
  if (scene === "code") {
    if (p < 0.42) return { x: 70, y: 28, down: false };
    return { x: 82, y: 52, down: p > 0.5 && p < 0.62 };
  }
  if (scene === "predict") {
    if (p < 0.22) return { x: 28, y: 22, down: false };
    if (p < 0.4) return { x: 18, y: 48, down: p > 0.28 && p < 0.36 };
    if (p < 0.55) return { x: 28, y: 72, down: p > 0.44 && p < 0.5 };
    if (p < 0.7) return { x: 42, y: 72, down: p > 0.58 && p < 0.64 };
    return { x: 74, y: 58, down: p > 0.76 && p < 0.84 };
  }
  return { x: 32, y: 34, down: false };
}

export function TurneeHowItWorks({
  stepLabels,
}: {
  stepLabels: Array<{ title: string; desc: string }>;
}) {
  const { t } = useLocale();
  const [scene, setScene] = useState<SceneId>("create");
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const sceneRef = useRef<SceneId>("create");
  const accRef = useRef(0);
  const pausedRef = useRef(false);
  const keyRef = useRef("");
  const nameLenRef = useRef(1);
  nameLenRef.current = t("tournament.tutorial.demoName").length;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      setReduced(mq.matches);
      if (mq.matches) {
        pausedRef.current = true;
        setPaused(true);
        accRef.current = SCENE_MS.create * 0.9;
        sceneRef.current = "create";
        setScene("create");
        setElapsed(accRef.current);
      }
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (paused) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(500, Math.max(0, now - last));
      last = now;
      if (!pausedRef.current && dt > 0 && document.visibilityState !== "hidden") {
        accRef.current += dt;
        let guard = 0;
        while (accRef.current >= SCENE_MS[sceneRef.current] && guard < 6) {
          accRef.current -= SCENE_MS[sceneRef.current];
          sceneRef.current = nextScene(sceneRef.current);
          guard += 1;
        }
        const key = visualKey(sceneRef.current, accRef.current, nameLenRef.current);
        if (key !== keyRef.current) {
          keyRef.current = key;
          setScene(sceneRef.current);
          setElapsed(accRef.current);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [paused]);

  function jump(id: SceneId) {
    sceneRef.current = id;
    accRef.current = reduced ? SCENE_MS[id] * 0.9 : 0;
    keyRef.current = visualKey(id, accRef.current, nameLenRef.current);
    setScene(id);
    setElapsed(accRef.current);
  }

  function togglePause() {
    setPaused((value) => {
      pausedRef.current = !value;
      return !value;
    });
  }

  const p = clamp01(elapsed / SCENE_MS[scene]);
  const activeStep = stepForScene(scene);
  const pose = cursorPose(scene, p);
  const captions: Record<SceneId, string> = {
    create: t("tournament.tutorial.captionCreate"),
    code: t("tournament.tutorial.captionCode"),
    predict: t("tournament.tutorial.captionPredict"),
    board: t("tournament.tutorial.captionBoard"),
  };
  const overall =
    (SCENES.indexOf(scene) + p) / SCENES.length;

  return (
    <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,440px)]">
      <ol className="grid content-start gap-3 sm:grid-cols-3 lg:grid-cols-1">
        {STEP_NUMBERS.map((n, i) => {
          const active = i === activeStep;
          return (
            <li key={n}>
              <button
                type="button"
                className={`turnee-step${active ? " is-active" : ""}`}
                aria-current={active ? "step" : undefined}
                onClick={() => jump(sceneForStep(i))}
              >
                <span className="turnee-step-num">{n}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-white">{stepLabels[i]?.title}</span>
                  <span className="mt-1 block text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.42)" }}>
                    {stepLabels[i]?.desc}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div
        className="turnee-actions-widget flex min-h-0 flex-col"
        role="region"
        aria-label={t("tournament.tutorial.region")}
      >
        <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <span className="flex gap-1" aria-hidden>
            <span className="h-2 w-2 rounded-full" style={{ background: "rgba(255,255,255,0.18)" }} />
            <span className="h-2 w-2 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }} />
            <span className="h-2 w-2 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
          </span>
          <span className="truncate text-[10px] font-semibold tracking-wide" style={{ color: "rgba(255,255,255,0.38)" }}>
            {scene === "predict" || scene === "board" ? "/turnee/party" : "/turnee"}
          </span>
        </div>

        <div className="relative h-[292px] overflow-hidden">
          <div className="absolute inset-0 p-3" aria-hidden>
            {scene === "create" ? <CreateScene p={p} /> : null}
            {scene === "code" ? <CodeScene p={p} /> : null}
            {scene === "predict" ? <PredictScene p={p} /> : null}
            {scene === "board" ? <BoardScene p={p} /> : null}
          </div>

          {reduced ? null : (
            <div
              aria-hidden
              className="turnee-demo-cursor pointer-events-none absolute z-20"
              style={{
                left: `${pose.x}%`,
                top: `${pose.y}%`,
                transform: pose.down ? "scale(0.86)" : "scale(1)",
              }}
            >
              {pose.down ? (
                <span className="absolute -left-2 -top-2 h-7 w-7 rounded-full border border-white/50" />
              ) : null}
              <svg width="18" height="18" viewBox="0 0 24 24" className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.65)]">
                <path d="M5.2 2.8 19.6 12.1 12.4 13.6 10.2 20.8Z" fill="#fff" stroke="#071428" strokeWidth="1.4" />
              </svg>
            </div>
          )}
        </div>

        <div className="mt-auto border-t px-3 py-2.5" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <div className="mb-2 h-0.5 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${overall * 100}%`,
                background: "linear-gradient(90deg, #C5A059, #D4AF37)",
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.62)" }} aria-live="polite">
              {captions[scene]}
            </p>
            <button
              type="button"
              onClick={togglePause}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-bold"
              style={{
                color: "#C5A059",
                background: "rgba(197,160,89,0.12)",
                border: "1px solid rgba(197,160,89,0.28)",
              }}
              aria-pressed={paused}
            >
              {paused ? <Play className="h-3 w-3" aria-hidden /> : <Pause className="h-3 w-3" aria-hidden />}
              {paused ? t("tournament.tutorial.play") : t("tournament.tutorial.pause")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: string }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: "rgba(255,255,255,0.35)" }}>
      {children}
    </span>
  );
}

function CreateScene({ p }: { p: number }) {
  const { t } = useLocale();
  const name = t("tournament.tutorial.demoName");
  const typed = name.slice(0, Math.round(seg(p, 0.08, 0.46) * name.length));
  const menuOpen = p >= 0.56 && p < 0.76;
  const picked = p >= 0.76;
  const pressing = p >= 0.86 && p < 0.93;
  const pickedLabel = COMPETITION_PICKER_OPTIONS.find((c) => c.storageKey === PICKED_KEY)?.label ?? "";
  const hoverKey = p < 0.66 ? MENU_KEYS[0] : PICKED_KEY;
  const nameFocus = p >= 0.08 && p < 0.5;
  const selectFocus = p >= 0.5 && p < 0.8;

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex gap-1 rounded-lg p-1" style={{ backgroundColor: "rgba(0,0,0,0.18)" }}>
        <span
          className="flex-1 rounded-md py-1.5 text-center text-[11px] font-bold"
          style={{ color: "#071428", background: "linear-gradient(135deg, #C5A059 0%, #D4AF37 100%)" }}
        >
          {t("tournament.create.title")}
        </span>
        <span className="flex-1 rounded-md py-1.5 text-center text-[11px] font-bold" style={{ color: "rgba(255,255,255,0.55)" }}>
          {t("tournament.join.title")}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <FieldLabel>{t("tournament.create.nameLabel")}</FieldLabel>
        <div
          className="flex h-8 items-center rounded-lg px-2.5 text-xs"
          style={{
            background: "var(--surface-low)",
            border: `1px solid ${nameFocus ? "var(--cyan)" : "var(--border-md)"}`,
            boxShadow: nameFocus ? "0 0 0 3px rgba(34,211,238,0.14)" : undefined,
            color: typed ? "#EEF2FF" : "rgba(255,255,255,0.28)",
          }}
        >
          <span className="truncate">{typed || t("tournament.create.namePlaceholder")}</span>
          {nameFocus ? <span className="turnee-demo-caret ml-px inline-block h-3.5 w-px bg-white" /> : null}
        </div>
      </div>

      <div className="relative flex flex-col gap-1">
        <FieldLabel>{t("tournament.create.competitionLabel")}</FieldLabel>
        <div
          className="flex h-8 items-center justify-between rounded-lg px-2.5 text-xs"
          style={{
            background: "var(--surface-low)",
            border: `1px solid ${selectFocus ? "var(--cyan)" : "var(--border-md)"}`,
            boxShadow: selectFocus ? "0 0 0 3px rgba(34,211,238,0.14)" : undefined,
            color: picked ? "#EEF2FF" : "rgba(255,255,255,0.28)",
          }}
        >
          <span className="truncate">{picked ? pickedLabel : t("tournament.create.competitionHint")}</span>
          <span style={{ color: "rgba(255,255,255,0.35)" }}>▾</span>
        </div>
        {menuOpen ? (
          <div
            className="absolute left-0 right-0 top-[52px] z-10 overflow-hidden rounded-lg border py-1"
            style={{ background: "#12151c", borderColor: "rgba(255,255,255,0.12)", boxShadow: "0 12px 28px rgba(0,0,0,0.45)" }}
          >
            {MENU_KEYS.map((key) => {
              const label = COMPETITION_PICKER_OPTIONS.find((c) => c.storageKey === key)?.label ?? key;
              const hot = key === hoverKey;
              return (
                <div
                  key={key}
                  className="truncate px-2.5 py-1.5 text-[11px]"
                  style={{
                    color: hot ? "#071428" : "#EEF2FF",
                    background: hot ? "#22D3EE" : "transparent",
                    fontWeight: hot ? 700 : 500,
                  }}
                >
                  {label}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <FieldLabel>{t("tournament.create.inviteCodeLabel")}</FieldLabel>
        <div
          className="flex h-8 items-center rounded-lg px-2.5"
          style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.10)" }}
        >
          <span className="text-[11px] font-bold tracking-[0.16em]" style={{ color: "#3B82F6" }}>
            {DEMO_CODE}
          </span>
        </div>
      </div>

      <div
        className="ph-btn-primary mt-1 h-9 w-full text-xs"
        style={{ transform: pressing ? "scale(0.98)" : undefined }}
      >
        {t("tournament.create.submit")}
      </div>
    </div>
  );
}

function CodeScene({ p }: { p: number }) {
  const { t } = useLocale();
  const copied = p >= 0.58;
  const pressing = p >= 0.5 && p < 0.62;
  return (
    <div className="flex h-full flex-col justify-center gap-3">
      <p className="text-sm font-semibold" style={{ color: "#60A5FA" }}>
        {t("tournament.create.success")}
      </p>
      <div className="flex items-center gap-2">
        <div
          className="flex-1 rounded-lg px-3 py-3 text-center text-base font-bold tracking-[0.22em]"
          style={{ backgroundColor: "rgba(255,255,255,0.03)", color: "#3B82F6", border: "1px solid rgba(59,130,246,0.2)" }}
        >
          {DEMO_CODE}
        </div>
        <div
          className="ph-btn-primary shrink-0 text-xs"
          style={{ padding: "11px 14px", transform: pressing ? "scale(0.98)" : undefined }}
        >
          {copied ? t("common.copied") : t("common.copy")}
        </div>
      </div>
      <p className="text-center text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
        {t("tournament.create.createAnother")}
      </p>
    </div>
  );
}

function PredictScene({ p }: { p: number }) {
  const { t } = useLocale();
  const ft = p >= 0.32 ? "HOME" : "";
  const home = p >= 0.48 ? "2" : "";
  const away = p >= 0.62 ? "1" : "";
  const pressing = p >= 0.76 && p < 0.84;
  const saved = p >= 0.84;
  return (
    <div
      className="relative h-full overflow-hidden rounded-xl border"
      style={{ borderColor: "rgba(59,130,246,0.18)", background: WC_CARD_GRADIENT }}
    >
      <div className="absolute inset-x-0 top-0 h-px opacity-70" style={{ background: WC_TOP_BORDER_GRADIENT }} />
      <div className="flex h-full flex-col gap-3 px-3 py-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <span className="truncate text-center text-xs font-bold text-white">{t("tournament.tutorial.homeTeam")}</span>
          <span
            className="rounded-lg px-2 py-2 text-center text-[10px] font-semibold"
            style={{ backgroundColor: "rgba(0,0,0,0.28)", border: `1px solid ${WC_BORDER}`, color: WC_MUTED }}
          >
            {t("tournament.tutorial.kickoff")}
          </span>
          <span className="truncate text-center text-xs font-bold text-white">{t("tournament.tutorial.awayTeam")}</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: WC_MUTED }}>
            {t("party.match.fullTime")}
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            {OUTCOMES.map((o) => {
              const on = ft === o.val;
              return (
                <span
                  key={o.val}
                  className="rounded-lg py-1.5 text-center text-xs font-bold"
                  style={{
                    backgroundColor: on ? WC_CYAN : "rgba(255,255,255,0.08)",
                    color: on ? WC_NAVY : WC_MUTED,
                    border: on ? "1px solid rgba(59,130,246,0.5)" : "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  {o.label}
                </span>
              );
            })}
          </div>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: WC_MUTED }}>
              {t("party.exactScore")}
            </span>
            <div className="flex items-center gap-2">
              <ScoreBox value={home} />
              <span className="text-sm font-bold" style={{ color: WC_MUTED }}>–</span>
              <ScoreBox value={away} />
            </div>
          </div>
          <span
            className="rounded-xl px-3 py-2.5 text-xs font-bold"
            style={{
              backgroundColor: WC_LIME,
              color: WC_NAVY,
              transform: pressing ? "scale(0.98)" : undefined,
            }}
          >
            {saved ? t("tournament.tutorial.saved") : t("party.savePrediction")}
          </span>
        </div>
      </div>
    </div>
  );
}

function ScoreBox({ value }: { value: string }) {
  return (
    <span
      className="flex h-10 w-10 items-center justify-center rounded-xl border text-base font-bold"
      style={{ backgroundColor: WC_NAVY, borderColor: WC_BORDER, color: value ? "#fff" : "rgba(255,255,255,0.28)" }}
    >
      {value || "X"}
    </span>
  );
}

function BoardScene({ p }: { p: number }) {
  const { t } = useLocale();
  const rows = [
    { name: t("tournament.tutorial.you"), points: 18, you: true },
    { name: "Andrei", points: 14, you: false },
    { name: "Maria", points: 11, you: false },
  ];
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex gap-1.5">
        <span
          className="rounded-lg px-2.5 py-1.5 text-[11px] font-bold"
          style={{ backgroundColor: "#3B82F6", color: "#0A0B1E" }}
        >
          {t("party.tab.leaderboard")}
        </span>
        <span
          className="rounded-lg px-2.5 py-1.5 text-[11px] font-bold"
          style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)" }}
        >
          {t("party.tab.predictions")}
        </span>
      </div>
      <div className="overflow-hidden rounded-xl border" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div
          className="grid grid-cols-[2rem_1fr_3rem] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide"
          style={{ color: "rgba(255,255,255,0.35)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <span>{t("party.lb.rank")}</span>
          <span />
          <span className="text-right">{t("party.lb.total")}</span>
        </div>
        {rows.map((row, i) => {
          const shown = p >= 0.08 + i * 0.12;
          const pts = Math.round(row.points * seg(p, 0.2 + i * 0.08, 0.55 + i * 0.08));
          const rank = i + 1;
          const podium = getPodiumStyle(rank);
          return (
            <div
              key={row.name}
              className="grid grid-cols-[2rem_1fr_3rem] items-center px-3 py-2 text-xs"
              style={{
                ...getLeaderboardRowStyle(rank, row.you),
                opacity: shown ? 1 : 0,
                transform: shown ? "translateY(0)" : "translateY(6px)",
                transition: "opacity 0.35s, transform 0.35s",
              }}
            >
              <span className="font-black tabular-nums" style={{ color: podium?.rankColor ?? "rgba(255,255,255,0.7)" }}>
                {rank}
              </span>
              <span className="truncate font-semibold text-white">{row.name}</span>
              <span className="text-right font-bold tabular-nums" style={{ color: WC_LIME }}>
                {pts}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
