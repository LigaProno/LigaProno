"use client";

import { useState } from "react";

export default function EmailTestButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSend() {
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/email-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: "rizon.teodor@gmail.com" }),
      });
      const data = (await res.json()) as {
        error?: string;
        hint?: string;
        results?: Record<string, { ok: boolean; reason?: string }>;
      };
      if (!res.ok) {
        setStatus("error");
        setMessage(data.hint ? `${data.error}: ${data.hint}` : data.error ?? "Eroare");
        return;
      }
      const parts = Object.entries(data.results ?? {}).map(([k, v]) =>
        v.ok ? `${k}: ok` : `${k}: ${v.reason ?? "fail"}`,
      );
      setStatus("ok");
      setMessage(parts.join(" · ") || "Trimise");
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Eroare de rețea");
    }
  }

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3"
      style={{
        backgroundColor: "#0D1422",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div>
        <h3 className="text-sm font-semibold text-white">Email — test</h3>
        <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
          Trimite sample-urile reminder, rezumat zilnic și clasament (From: noreply@ligaprono.ro).
        </p>
      </div>
      <button
        type="button"
        onClick={onSend}
        disabled={status === "loading"}
        className="self-start px-4 py-2 text-sm font-semibold rounded-lg disabled:opacity-50"
        style={{
          background: "linear-gradient(135deg, #BEF264 0%, #84CC16 100%)",
          color: "#080B12",
        }}
      >
        {status === "loading" ? "Se trimit…" : "Trimite emailuri de test"}
      </button>
      {message ? (
        <p
          className="text-xs"
          style={{ color: status === "error" ? "#fca5a5" : "rgba(190,242,100,0.85)" }}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
