import Image from "next/image";
import Link from "next/link";
import type { WcNewsItem } from "@/lib/wc-dashboard-news";
import {
  ALLOWED_NEWS_PUBLISHER_LABELS,
  NEWS_FALLBACK_IMAGES,
  resolveNewsImageUrl,
} from "@/lib/gemini-wc-news";
import NewsCardImage from "@/components/dashboard/news-card-image";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1920&q=80";
const WC_BADGE =
  "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=800&q=80";

function formatNewsDate(iso: string | undefined, fallback: Date | null): string {
  if (iso) {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("ro-RO", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
  }
  if (fallback) {
    return fallback.toLocaleDateString("ro-RO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  return "Astăzi";
}

function NewsCard({
  item,
  index,
  fetchedAt,
  featured = false,
}: {
  item: WcNewsItem;
  index: number;
  fetchedAt: Date | null;
  featured?: boolean;
}) {
  const thumb = resolveNewsImageUrl(item, index);
  const fallback = NEWS_FALLBACK_IMAGES[index % NEWS_FALLBACK_IMAGES.length];

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group block rounded-2xl border overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-xl ${
        featured ? "sm:col-span-2" : ""
      }`}
      style={{
        borderColor: "rgba(255,255,255,0.1)",
        backgroundColor: "rgba(255,255,255,0.04)",
      }}
    >
      <div
        className={
          featured
            ? "flex flex-col md:flex-row md:min-h-[220px]"
            : "flex flex-col h-full"
        }
      >
        <div
          className={`relative shrink-0 overflow-hidden bg-slate-800/80 ${
            featured
              ? "w-full md:w-[42%] aspect-[16/10] md:aspect-auto md:min-h-[220px]"
              : "w-full aspect-[16/10]"
          }`}
        >
          <NewsCardImage
            src={thumb}
            fallback={fallback}
            alt={item.title}
            priority={featured}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(to top, rgba(15,23,42,0.75) 0%, transparent 50%)",
            }}
          />
          <span
            className="absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-lg"
            style={{
              backgroundColor: "rgba(15,23,42,0.75)",
              color: "#22D3EE",
              backdropFilter: "blur(8px)",
            }}
          >
            #{index + 1}
          </span>
        </div>

        <div className={`flex flex-col justify-center p-5 sm:p-6 ${featured ? "md:flex-1" : "flex-1"}`}>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: "#BEF264" }}
            >
              {item.source}
            </span>
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
              · {formatNewsDate(item.publishedAt, fetchedAt)}
            </span>
          </div>
          <h3
            className={`font-bold leading-snug mb-2 group-hover:underline underline-offset-2 ${
              featured ? "text-lg sm:text-xl" : "text-base"
            }`}
            style={{ color: "#F8FAFC" }}
          >
            {item.title}
          </h3>
          <p
            className={`text-sm leading-relaxed ${featured ? "line-clamp-3" : "line-clamp-2"}`}
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            {item.summary}
          </p>
          <span
            className="inline-flex items-center gap-1 mt-4 text-xs font-semibold"
            style={{ color: "#22D3EE" }}
          >
            Citește articolul
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </span>
        </div>
      </div>
    </a>
  );
}

type DashboardHomeProps = {
  news: WcNewsItem[];
  newsFetchedAt: Date | null;
  newsDateKey: string;
};

export default function DashboardHome({
  news,
  newsFetchedAt,
  newsDateKey,
}: DashboardHomeProps) {
  const updatedLabel = newsFetchedAt
    ? newsFetchedAt.toLocaleString("ro-RO", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={HERO_IMAGE}
            alt="Stadion de fotbal"
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(105deg, rgba(15,23,42,0.97) 0%, rgba(15,23,42,0.75) 45%, rgba(15,23,42,0.55) 100%)",
            }}
          />
        </div>

        <div className="relative z-10 px-6 sm:px-10 lg:px-14 pt-10 sm:pt-14 pb-16 sm:pb-20 max-w-6xl">
          <p
            className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] mb-3"
            style={{ color: "#BEF264" }}
          >
            Bine ai venit pe PronoHub
          </p>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white leading-tight max-w-2xl mb-4">
            Prezice. Concurează.{" "}
            <span style={{ color: "#22D3EE" }}>Câștigă.</span>
          </h1>
          <p
            className="text-base sm:text-lg max-w-xl mb-8 leading-relaxed"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            Platforma ta de pronosticuri cu prietenii — clasamente live, party-uri private
            și evenimente majore de fotbal.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/party"
              className="px-6 py-3 rounded-xl font-bold text-sm sm:text-base shadow-lg transition active:scale-[0.98]"
              style={{ backgroundColor: "#22D3EE", color: "#0F172A" }}
            >
              Intră în Party
            </Link>
            <Link
              href="/matches"
              className="px-6 py-3 rounded-xl font-bold text-sm sm:text-base border transition active:scale-[0.98]"
              style={{
                borderColor: "rgba(190,242,100,0.5)",
                color: "#BEF264",
                backgroundColor: "rgba(190,242,100,0.08)",
              }}
            >
              Program CM 2026
            </Link>
          </div>
        </div>
      </section>

      <div className="px-6 sm:px-10 lg:px-14 pb-16 max-w-6xl mx-auto space-y-12 mt-4 relative z-20">
        {/* Eveniment principal */}
        <section>
          

          <article
            className="rounded-3xl border overflow-hidden grid md:grid-cols-[1.1fr_1fr]"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              backgroundColor: "rgba(255,255,255,0.03)",
            }}
          >
            <div className="relative min-h-[220px] md:min-h-[320px]">
              <Image
                src={WC_BADGE}
                alt="Fotbal — Cupa Mondială"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div
                className="absolute inset-0 md:hidden"
                style={{
                  background:
                    "linear-gradient(to top, rgba(15,23,42,0.95) 0%, transparent 60%)",
                }}
              />
            </div>

            <div className="p-6 sm:p-8 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-3">
                <div>

                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                    FIFA World Cup 2026
                  </h2>
                </div>
              </div>
              <p className="text-sm sm:text-base leading-relaxed mb-6" style={{ color: "rgba(255,255,255,0.6)" }}>
                SUA, Canada și Mexic găzduiesc cel mai mare turneu din fotbal. Urmărește clasamentele
                și meciurile, creează un party și pune pronosticuri pe fiecare fază — de la grupe până la finală.
              </p>
              <ul className="space-y-2 mb-6 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                <li className="flex items-center gap-2">
                  <span style={{ color: "#22D3EE" }}>✓</span> Clasament & program live (Football-Data)
                </li>
                <li className="flex items-center gap-2">
                  <span style={{ color: "#22D3EE" }}>✓</span> Party-uri private cu clasament
                </li>
                <li className="flex items-center gap-2">
                  <span style={{ color: "#22D3EE" }}>✓</span> Pronosticuri meci + calificări & campion
                </li>
              </ul>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/matches"
                  className="inline-flex px-5 py-2.5 rounded-xl text-sm font-bold"
                  style={{ backgroundColor: "#22D3EE", color: "#0F172A" }}
                >
                  Vezi CM 2026
                </Link>
                <Link
                  href="/party"
                  className="inline-flex px-5 py-2.5 rounded-xl text-sm font-bold border"
                  style={{
                    borderColor: "rgba(255,255,255,0.2)",
                    color: "rgba(255,255,255,0.85)",
                  }}
                >
                  Creează party
                </Link>
              </div>
            </div>
          </article>
        </section>

        {/* Știri */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
                Știri de ultimă oră — CM 2026
              </h2>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                5 articole zilnic (RSS) ·{" "}
                {ALLOWED_NEWS_PUBLISHER_LABELS.join(", ")}
                {updatedLabel ? ` · ultima actualizare ${updatedLabel}` : ""}
              </p>
            </div>
            <span
              className="text-xs font-mono px-3 py-1.5 rounded-lg shrink-0"
              style={{
                backgroundColor: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              {newsDateKey}
            </span>
          </div>

          {news.length === 0 ? (
            <div
              className="rounded-2xl border p-8 text-center text-sm"
              style={{
                borderColor: "rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.45)",
              }}
            >
              <p className="mb-2">Știrile se încarcă la prima vizită a zilei sau la cron-ul zilnic.</p>
              <p>
                Asigură-te că <code className="text-[#22D3EE]">GEMINI_API_KEY</code> este setat în mediul
                de rulare.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {news.map((item, i) => (
                <NewsCard
                  key={`${item.url}-${i}`}
                  item={item}
                  index={i}
                  fetchedAt={newsFetchedAt}
                  featured={i === 0}
                />
              ))}
            </div>
          )}
        </section>

        {/* Features rapide */}
        <section className="grid sm:grid-cols-3 gap-4">
          {[
            {
              title: "Party",
              desc: "Invită prietenii cu cod unic și urmăriți clasamentul împreună.",
              href: "/party",
              accent: "#22D3EE",
            },
            {
              title: "Pronosticuri",
              desc: "Meciuri, calificări din grupe și campion — punctaj cu cote Gemini.",
              href: "/party",
              accent: "#BEF264",
            },
            {
              title: "CM 2026 Hub",
              desc: "Clasament grupe, program și eliminări direct din Football-Data.",
              href: "/matches",
              accent: "#F472B6",
            },
          ].map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="rounded-2xl border p-5 transition hover:bg-white/[0.03]"
              style={{ borderColor: "rgba(255,255,255,0.08)" }}
            >
              <div
                className="w-10 h-1 rounded-full mb-4"
                style={{ backgroundColor: card.accent }}
              />
              <h3 className="font-bold text-white mb-2">{card.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                {card.desc}
              </p>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
