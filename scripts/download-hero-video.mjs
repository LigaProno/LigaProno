/**
 * Descarcă hero dashboard (1080p de pe YouTube) și optimizează cu ffmpeg.
 *
 * Usage: npm run hero-video
 */
import { spawnSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";

const VIDEO_ID = "ejuiCkS7xXE";
const PUBLIC = path.join(process.cwd(), "public");
const TMP_1080 = path.join(PUBLIC, "wc2026-hero-src.mp4");
const OUT_1080 = path.join(PUBLIC, "wc2026-hero.mp4");
const URL = `https://www.youtube.com/watch?v=${VIDEO_ID}`;
const PYTHON = process.platform === "win32" ? "py" : "python";

function run(cmd, args) {
  const result = spawnSync(cmd, args, { stdio: "inherit" });
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("Downloading 1080p source…");
run(PYTHON, [
  "-m",
  "yt_dlp",
  "-f",
  "299/137/bestvideo[height<=1080][ext=mp4]/best[height<=1080]",
  "-o",
  TMP_1080,
  URL,
]);

console.log("Optimizing for web (1080p)…");
run("ffmpeg", [
  "-y",
  "-i",
  TMP_1080,
  "-an",
  "-vf",
  "scale=1920:1080:flags=lanczos+accurate_rnd+full_chroma_int",
  "-c:v",
  "libx264",
  "-profile:v",
  "high",
  "-pix_fmt",
  "yuv420p",
  "-crf",
  "20",
  "-preset",
  "slow",
  "-movflags",
  "+faststart",
  OUT_1080,
]);

if (existsSync(TMP_1080)) {
  unlinkSync(TMP_1080);
}

console.log("Done: public/wc2026-hero.mp4 (1920×1080)");
