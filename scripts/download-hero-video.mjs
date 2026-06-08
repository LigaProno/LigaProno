/**
 * Descarcă hero dashboard (720p max de pe YouTube) și   upscale la 1080p cu ffmpeg.
 *
 * Usage: npm run hero-video
 */
import { spawnSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";

const VIDEO_ID = "wadWb7PmgI4";
const PUBLIC = path.join(process.cwd(), "public");
const TMP_720 = path.join(PUBLIC, "wc2026-hero-720.mp4");
const OUT_1080 = path.join(PUBLIC, "wc2026-hero.mp4");
const URL = `https://www.youtube.com/watch?v=${VIDEO_ID}`;

function run(cmd, args) {
  const result = spawnSync(cmd, args, { stdio: "inherit", shell: true });
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("Downloading 720p60 source…");
run("python", [
  "-m",
  "yt_dlp",
  "-f",
  "298/bestvideo[height<=720][ext=mp4]/best[height<=720]",
  "-o",
  TMP_720,
  URL,
]);

console.log("Upscaling to 1080p…");
run("ffmpeg", [
  "-y",
  "-i",
  TMP_720,
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

if (existsSync(TMP_720)) {
  unlinkSync(TMP_720);
}

console.log("Done: public/wc2026-hero.mp4 (1920×1080)");
