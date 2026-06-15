import type { MatchPredDisplay } from "@/lib/wc-pred-display";

export function MatchPredDisplayInline({
  pred,
  labelHt,
  labelFt,
  labelScore,
  stacked = false,
  className = "",
}: {
  pred: MatchPredDisplay;
  labelHt: string;
  labelFt: string;
  labelScore: string;
  stacked?: boolean;
  className?: string;
}) {
  if (stacked) {
    return (
      <div className={`text-[10px] leading-snug space-y-0.5 tabular-nums ${className}`}>
        <div>
          <span style={{ color: "rgba(255,255,255,0.42)" }}>{labelHt}</span>{" "}
          <span className="font-medium">{pred.ht}</span>
        </div>
        <div>
          <span style={{ color: "rgba(255,255,255,0.42)" }}>{labelFt}</span>{" "}
          <span className="font-medium">{pred.ft}</span>
        </div>
        <div>
          <span style={{ color: "rgba(255,255,255,0.42)" }}>{labelScore}</span>{" "}
          <span className="font-medium">{pred.score}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`text-[10px] leading-snug tabular-nums ${className}`}>
      <span style={{ color: "rgba(255,255,255,0.42)" }}>{labelHt}</span>{" "}
      <span className="font-medium">{pred.ht}</span>
      <span style={{ color: "rgba(255,255,255,0.25)" }} className="mx-1">
        ·
      </span>
      <span style={{ color: "rgba(255,255,255,0.42)" }}>{labelFt}</span>{" "}
      <span className="font-medium">{pred.ft}</span>
      <span style={{ color: "rgba(255,255,255,0.25)" }} className="mx-1">
        ·
      </span>
      <span style={{ color: "rgba(255,255,255,0.42)" }}>{labelScore}</span>{" "}
      <span className="font-medium">{pred.score}</span>
    </div>
  );
}
