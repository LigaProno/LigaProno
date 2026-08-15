"use client";

import { useState, useTransition } from "react";
import { sendMarketingEmail } from "@/app/actions/admin";

type Props = {
  subscriberCount: number;
};

export default function EmailComposer({ subscriberCount }: Props) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [confirmSend, setConfirmSend] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const canSend = subject.trim().length >= 5 && body.trim().length >= 20;

  const handleSend = () => {
    if (!confirmSend) {
      setConfirmSend(true);
      return;
    }

    setResult(null);
    startTransition(async () => {
      const res = await sendMarketingEmail({ subject: subject.trim(), body: body.trim() });
      setResult({
        ok: res.ok,
        message: res.ok
          ? `Email trimis cu succes la ${res.sentCount} abonați.`
          : res.error,
      });
      if (res.ok) {
        setSubject("");
        setBody("");
        setConfirmSend(false);
      }
    });
  };

  const handleCancel = () => {
    setConfirmSend(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-white/50">Subiect</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Ex: Noutăți Liga Prono - August 2026"
          className="px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-blue-500"
          disabled={isPending}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-white/50">Conținut (text)</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Scrie conținutul emailului aici..."
          rows={8}
          className="px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-blue-500 resize-none"
          disabled={isPending}
        />
        <p className="text-xs text-white/30">
          {body.length} caractere • minim 20 pentru a putea trimite
        </p>
      </div>

      {result && (
        <div
          className={`px-3 py-2 rounded-lg text-sm ${
            result.ok ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
          }`}
        >
          {result.message}
        </div>
      )}

      {confirmSend && !isPending && (
        <div className="px-3 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <p className="text-sm text-yellow-200 mb-3">
            Ești sigur că vrei să trimiți acest email la <strong>{subscriberCount}</strong> abonați?
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleSend}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-green-500 text-white hover:bg-green-600 transition-colors"
            >
              Da, trimite
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white/10 text-white/70 hover:bg-white/15 transition-colors"
            >
              Anulează
            </button>
          </div>
        </div>
      )}

      {!confirmSend && (
        <button
          onClick={handleSend}
          disabled={!canSend || isPending || subscriberCount === 0}
          className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-blue-500 text-white hover:bg-blue-600"
        >
          {isPending
            ? "Se trimite..."
            : subscriberCount === 0
              ? "Niciun abonat"
              : `Trimite la ${subscriberCount} abonați`}
        </button>
      )}

      <p className="text-xs text-white/30 text-center">
        Emailurile vor include automat link-ul de dezabonare.
      </p>
    </div>
  );
}
