"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendSupportEmail } from "@/app/actions/support";
import { useLocale } from "@/components/i18n/locale-provider";

const CATEGORIES = [
  { value: "bug",        ro: "Raport bug",  en: "Bug report" },
  { value: "question",   ro: "Întrebare",   en: "Question" },
  { value: "suggestion", ro: "Sugestie",    en: "Suggestion" },
  { value: "other",      ro: "Altele",      en: "Other" },
] as const;

export default function SupportForm({
  prefillName,
  prefillEmail,
}: {
  prefillName: string;
  prefillEmail: string;
}) {
  const { locale } = useLocale();
  const ro = locale === "ro";
  const router = useRouter();

  const [name, setName]         = useState(prefillName);
  const [email, setEmail]       = useState(prefillEmail);
  const [category, setCategory] = useState("");
  const [message, setMessage]   = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [sent, setSent]         = useState(false);
  const [isPending, startTransition] = useTransition();

  const canSubmit = name.trim() && email.trim() && category && message.trim().length >= 10;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      try {
        await sendSupportEmail({ name: name.trim(), email: email.trim(), category, message: message.trim() });
        setSent(true);
        router.refresh(); // ca noul tichet să apară în „Tichetele mele"
      } catch (err) {
        setError(err instanceof Error ? err.message : ro ? "Eroare la trimitere." : "Failed to send.");
      }
    });
  }

  if (sent) {
    return (
      <div
        className="rounded-xl p-8 flex flex-col items-center gap-4 text-center"
        style={{ backgroundColor: "#0D1422", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 2px 12px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)" }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #BEF264 0%, #84CC16 100%)", boxShadow: "0 0 24px rgba(190,242,100,0.3)" }}
        >
          <svg className="w-7 h-7" fill="none" stroke="#080B12" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h3 className="text-white font-bold text-lg mb-1">
            {ro ? "Mesaj trimis!" : "Message sent!"}
          </h3>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
            {ro
              ? "Am primit mesajul tău. Îți vom răspunde în maxim 24 de ore."
              : "We received your message and will reply within 24 hours."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setSent(false); setMessage(""); setCategory(""); }}
          className="text-sm transition-opacity hover:opacity-70 mt-1"
          style={{ color: "#22D3EE" }}
        >
          {ro ? "Trimite alt mesaj" : "Send another message"}
        </button>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-6 sm:p-8"
      style={{ backgroundColor: "#0D1422", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 2px 12px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)" }}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: "rgba(255,255,255,0.35)" }}>
              {ro ? "Nume" : "Name"}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={ro ? "Numele tău" : "Your name"}
              maxLength={80}
              required
              className="ph-input"
            />
          </div>
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: "rgba(255,255,255,0.35)" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplu.com"
              maxLength={120}
              required
              className="ph-input"
            />
          </div>
        </div>

        {/* Category */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: "rgba(255,255,255,0.35)" }}>
            {ro ? "Categorie" : "Category"}
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className="ph-input"
            style={{ color: category ? "#EEF2FF" : "rgba(255,255,255,0.28)" }}
          >
            <option value="" disabled style={{ backgroundColor: "#060911" }}>
              {ro ? "Selectează o categorie" : "Select a category"}
            </option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value} style={{ color: "#EEF2FF", backgroundColor: "#060911" }}>
                {ro ? c.ro : c.en}
              </option>
            ))}
          </select>
        </div>

        {/* Message */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: "rgba(255,255,255,0.35)" }}>
            {ro ? "Mesaj" : "Message"}
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              ro
                ? "Descrie problema sau întrebarea ta cât mai detaliat…"
                : "Describe your issue or question in as much detail as possible…"
            }
            rows={6}
            maxLength={3000}
            required
            className="ph-input resize-none"
            style={{ lineHeight: "1.6" }}
          />
          <span className="text-xs self-end" style={{ color: "rgba(255,255,255,0.22)" }}>
            {message.length}/3000
          </span>
        </div>

        {error && (
          <p className="text-sm rounded-lg px-4 py-3" style={{ color: "#fca5a5", backgroundColor: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending || !canSubmit}
          className="ph-btn-primary w-full"
        >
          {isPending
            ? (ro ? "Se trimite…" : "Sending…")
            : (ro ? "Trimite mesajul" : "Send message")}
        </button>
      </form>
    </div>
  );
}
