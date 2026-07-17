"use client";

import { useState, useTransition } from "react";
import { SupportStatus } from "@prisma/client";
import { addSupportComment, setSupportMessageStatus } from "@/app/actions/support";

export function SupportStatusButtons({
  messageId,
  status,
}: {
  messageId: string;
  status: SupportStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const act = (next: "OPEN" | "SEEN" | "DONE") => {
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
    <div className="flex flex-col items-end gap-1 shrink-0">
      <div className="flex flex-wrap gap-1.5 justify-end">
        {status === SupportStatus.OPEN ? (
          <button
            type="button"
            onClick={() => act("SEEN")}
            disabled={isPending}
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
            style={{ backgroundColor: "#FBBF24", color: "#0A0B1E" }}
          >
            Marchează văzut
          </button>
        ) : null}
        {status !== SupportStatus.DONE ? (
          <button
            type="button"
            onClick={() => act("DONE")}
            disabled={isPending}
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
            style={{ backgroundColor: "#34D399", color: "#0A0B1E" }}
          >
            Marchează rezolvat
          </button>
        ) : (
          <button
            type="button"
            onClick={() => act("OPEN")}
            disabled={isPending}
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
            style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
          >
            Redeschide
          </button>
        )}
      </div>
      {error ? <span className="text-[10px] text-red-400">{error}</span> : null}
    </div>
  );
}

export function SupportCommentBox({ messageId }: { messageId: string }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    const text = body.trim();
    if (!text) return;
    setError(null);
    startTransition(async () => {
      try {
        await addSupportComment(messageId, text);
        setBody("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Eroare.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2 items-end">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="Scrie un răspuns pentru user…"
          className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none resize-y"
          style={{
            backgroundColor: "rgba(0,0,0,0.25)",
            borderColor: "rgba(255,255,255,0.1)",
            color: "#fff",
          }}
        />
        <button
          type="button"
          onClick={submit}
          disabled={isPending || !body.trim()}
          className="px-4 py-2 rounded-lg text-xs font-bold transition-opacity hover:opacity-90 disabled:opacity-40 whitespace-nowrap"
          style={{ backgroundColor: "#3B82F6", color: "#0A0B1E" }}
        >
          {isPending ? "..." : "Trimite"}
        </button>
      </div>
      {error ? <span className="text-[10px] text-red-400">{error}</span> : null}
    </div>
  );
}
