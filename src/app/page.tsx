import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { pageTitle } from "@/lib/site-metadata";

export const metadata = pageTitle("Pronosticuri sportive");

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-5 sm:p-10 relative overflow-hidden"
      style={{ backgroundColor: "#0F172A" }}
    >
      {/* Decorative blobs */}
      <div
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20"
        style={{ backgroundColor: "#22D3EE" }}
      />
      <div
        className="absolute -bottom-32 -right-32 w-[32rem] h-[32rem] rounded-full blur-3xl pointer-events-none opacity-15"
        style={{ backgroundColor: "#BEF264" }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] rounded-full blur-3xl pointer-events-none opacity-5"
        style={{ backgroundColor: "#22D3EE" }}
      />

      <div className="relative z-10 text-center max-w-lg w-full flex flex-col items-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div
            className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-xl"
            style={{ backgroundColor: "#22D3EE" }}
          >
            <svg
              className="w-5 h-5 sm:w-8 sm:h-8"
              style={{ color: "#0F172A" }}
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
            Prono<span style={{ color: "#22D3EE" }}>Hub</span>
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-4 sm:mb-5 text-white">
          Predict. Compete.<br />
          <span style={{ color: "#22D3EE" }}>Dominate.</span>
        </h1>
        <p className="text-base sm:text-xl leading-relaxed mb-8 sm:mb-10 max-w-md" style={{ color: "rgba(255,255,255,0.65)" }}>
          Join thousands of sports fans making predictions, climbing leaderboards,
          and winning glory every matchday.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link
            href="/sign-in"
            className="px-8 py-4 font-bold text-lg rounded-2xl shadow-xl active:scale-95 transition-all text-center"
            style={{ backgroundColor: "#22D3EE", color: "#0F172A" }}
          >
            Log In
          </Link>
          <Link
            href="/sign-up"
            className="px-8 py-4 font-bold text-lg rounded-2xl border active:scale-95 transition-all text-center"
            style={{
              backgroundColor: "rgba(255,255,255,0.08)",
              borderColor: "rgba(255,255,255,0.2)",
              color: "#BEF264",
            }}
          >
            Create Account
          </Link>
        </div>

        <Link
          href="/matches"
          className="mt-6 inline-flex items-center gap-2 text-base font-semibold underline-offset-4 hover:underline transition-all"
          style={{ color: "#22D3EE" }}
        >
          Schedule & standings
          <span aria-hidden="true">→</span>
        </Link>

        {/* Stats */}
        <div className="mt-10 sm:mt-14 grid grid-cols-3 gap-3 sm:gap-6 w-full max-w-xs sm:max-w-sm">
          {[
            { value: "50K+", label: "Players" },
            { value: "200+", label: "Leagues" },
            { value: "98%", label: "Uptime" },
          ].map(({ value, label }) => (
            <div
              key={label}
              className="rounded-2xl p-4"
              style={{ backgroundColor: "rgba(255,255,255,0.07)" }}
            >
              <div className="text-2xl sm:text-3xl font-bold" style={{ color: "#BEF264" }}>
                {value}
              </div>
              <div className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
