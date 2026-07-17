import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE_RO } from "@/lib/site-metadata";

export const alt = `${SITE_NAME} — Pronosticuri Fotbal`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** OG image generat — evită să livrăm logo-ul de 2500x2500 / 4MB către scrapere. */
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0A0B1E",
          backgroundImage:
            "radial-gradient(circle at 25% 20%, rgba(59,130,246,0.22) 0%, transparent 45%), radial-gradient(circle at 78% 82%, rgba(212,175,55,0.20) 0%, transparent 45%)",
          padding: 80,
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 800,
            color: "#FFFFFF",
            letterSpacing: -2,
            display: "flex",
          }}
        >
          {SITE_NAME}
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 34,
            color: "rgba(255,255,255,0.62)",
            textAlign: "center",
            maxWidth: 900,
            lineHeight: 1.35,
            display: "flex",
          }}
        >
          {SITE_TAGLINE_RO}
        </div>
        <div
          style={{
            marginTop: 56,
            height: 6,
            width: 220,
            borderRadius: 999,
            background: "linear-gradient(90deg, #D4AF37 0%, #E8C878 100%)",
            display: "flex",
          }}
        />
      </div>
    ),
    size,
  );
}
