"use client";

import { useState, useTransition } from "react";
import { setSupportMessageStatus } from "@/app/actions/support";

export default function SupportMessageStatusButton({
  messageId,
  status,
}: {
  messageId: string;
  status: "OPEN" | "DONE";
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isDone = status === "DONE";
  const next = isDone ? "OPEN" : "DONE";

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      try {
        await setSupportMessageStatus(messageId, next);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Eroare.");
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
        style={
          isDone
            ? { backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }
            : { backgroundColor: "#34D399", color: "#0A0B1E" }
        }
      >
        {isPending ? "..." : isDone ? "Redeschide" : "Marchează rezolvat"}
      </button>
      {error ? <span className="text-[10px] text-red-400">{error}</span> : null}
    </div>
  );
}
