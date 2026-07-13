"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { WcNewsItem } from "@/lib/wc-dashboard-news";
import {
  ALLOWED_NEWS_PUBLISHER_LABELS,
  NEWS_FALLBACK_IMAGES,
  resolveNewsImageUrl,
} from "@/lib/gemini-wc-news";
import NewsCardImage from "@/components/dashboard/news-card-image";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  WC_CYAN,
  WC_GOLD,
  WC_GREEN,
  WC_LIME,
  WC_NAVY,
} from "@/components/world-cup/wc-theme";

const WC2026_EMBLEM = "/wc2026-emblem.svg";
const WC2026_HERO_VIDEO = "/wc2026-hero.mp4";

function formatNewsDate(
  iso: string | undefined,
  fallback: Date | null,
  dateLocale: string,
  todayLabel: string,
): string {
  if (iso) {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(dateLocale, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
  }
  if (fallback) {
    return fallback.toLocaleDateString(dateLocale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  return todayLabel;
}

function NewsCard({
  item,
  index,
  fetchedAt,
  featured = false,
  dateLocale,
  todayLabel,
}: {
  item: WcNewsItem;
  index: number;
  fetchedAt: Date | null;
  featured?: boolean;
  dateLocale: string;
  todayLabel: string;
}) {
  const thumb = resolveNewsImageUrl(item, index);
  const fallback = NEWS_FALLBACK_IMAGES[index % NEWS_FALLBACK_IMAGES.length];

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group block rounded-xl border overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-xl ${
        featured ? "sm:col-span-2" : ""
      }`}
      style={{
        borderColor: "rgba(255,255,255,0.08)",
        backgroundColor: "rgba(255,255,255,0.06)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.35)",
      }}
    >
      <div
        className={
          featured ?
            "flex flex-col md:flex-row md:min-h-[220px]"
          : "flex flex-col h-full"
        }
      >
        <div
          className={`relative shrink-0 overflow-hidden bg-slate-800/80 ${
            featured ?
              "w-full md:w-[42%] aspect-[16/10] md:aspect-auto md:min-h-[220px]"
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
                "linear-gradient(to top, rgba(8,11,18,0.75) 0%, transparent 50%)",
            }}
          />
          <span
            className="absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-lg"
            style={{
              backgroundColor: "rgba(8,11,18,0.75)",
              color: WC_CYAN,
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
              style={{ color: WC_LIME }}
            >
              {item.source}
            </span>
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
              · {formatNewsDate(item.publishedAt, fetchedAt, dateLocale, todayLabel)}
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
          {item.summary ?
            <p
              className="text-sm leading-relaxed line-clamp-3"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              {item.summary}
            </p>
          : null}
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
  const { t, dateLocale } = useLocale();

  const updatedLabel = newsFetchedAt
    ? newsFetchedAt.toLocaleString(dateLocale, {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const newsSourcesLine = useMemo(
    () =>
      t("dashboard.news.sources", {
        sources: ALLOWED_NEWS_PUBLISHER_LABELS.join(", "),
      }),
    [t],
  );

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <section
        className="relative overflow-hidden min-h-[min(88vh,780px)] flex items-center"
        style={{ backgroundColor: WC_NAVY }}
      >
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover motion-reduce:hidden"
          poster={WC2026_EMBLEM}
        >
          <source src={WC2026_HERO_VIDEO} type="video/mp4" />
        </video>

        <div
          className="absolute inset-0 motion-reduce:block hidden"
          style={{
            background:
              "linear-gradient(160deg, rgba(8,11,18,0.98) 0%, rgba(22,101,52,0.25) 50%, rgba(8,11,18,0.98) 100%)",
          }}
        />

        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(8,11,18,0.45) 0%, rgba(8,11,18,0.25) 40%, rgba(8,11,18,0.75) 100%)",
          }}
        />

        <div className="absolute top-5 left-5 sm:top-7 sm:left-8 lg:top-8 lg:left-10 z-20 pointer-events-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={WC2026_EMBLEM}
            alt="FIFA World Cup 2026"
            width={96}
            height={148}
            className="w-14 sm:w-16 md:w-20 h-auto drop-shadow-[0_4px_24px_rgba(0,0,0,0.65)]"
          />
        </div>

        <div className="relative z-10 w-full px-6 sm:px-10 lg:px-14 py-16 sm:py-20 max-w-6xl mx-auto flex flex-col items-center justify-center text-center min-h-[inherit]">
          <p
            className="text-base sm:text-lg max-w-xl mb-8 sm:mb-10 leading-relaxed"
            style={{ color: "rgba(255,255,255,0.82)" }}
          >
            {t("dashboard.hero.subtitle")}
          </p>

          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/turnee"
              className="px-7 py-3.5 rounded-xl font-bold text-sm sm:text-base shadow-lg transition hover:brightness-110 active:scale-[0.98]"
              style={{ backgroundColor: WC_CYAN, color: WC_NAVY }}
            >
              {t("dashboard.hero.myTournaments")}
            </Link>
          </div>
        </div>

        <div
          className="absolute bottom-0 left-0 right-0 h-1 opacity-80 pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent, ${WC_GREEN}, ${WC_GOLD}, ${WC_CYAN}, transparent)`,
          }}
        />
      </section>

      <div className="px-6 sm:px-10 lg:px-14 pb-16 max-w-6xl mx-auto space-y-12 mt-8">
        <section>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
                {t("dashboard.news.title")}
              </h2>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                {newsSourcesLine}
                {updatedLabel ?
                  t("dashboard.news.lastUpdate", { date: updatedLabel })
                : ""}
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

          {news.length === 0 ?
            <div
              className="rounded-2xl border p-8 text-center text-sm"
              style={{
                borderColor: "rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.45)",
              }}
            >
              <p className="mb-2">{t("dashboard.news.emptyHint")}</p>
              <p>
                <code className="text-[#3B82F6]">GEMINI_API_KEY</code> — {t("dashboard.news.geminiHint")}
              </p>
            </div>
          : (
            <div className="grid gap-4 sm:grid-cols-2">
              {news.map((item, i) => (
                <NewsCard
                  key={`${item.url}-${i}`}
                  item={item}
                  index={i}
                  fetchedAt={newsFetchedAt}
                  featured={i === 0}
                  dateLocale={dateLocale}
                  todayLabel={t("common.today")}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
