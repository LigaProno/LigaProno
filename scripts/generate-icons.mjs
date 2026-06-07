import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import pngToIco from "png-to-ico";
import sharp from "sharp";

const ROOT = process.cwd();
const SVG = path.join(ROOT, "public", "wc2026-emblem.svg");
const APP = path.join(ROOT, "src", "app");
const BG = { r: 15, g: 23, b: 42, alpha: 1 };

async function renderSquare(size) {
  return sharp(SVG)
    .resize(size, size, { fit: "contain", background: BG })
    .png()
    .toBuffer();
}

async function main() {
  await mkdir(APP, { recursive: true });

  const icon32 = await renderSquare(32);
  const icon180 = await renderSquare(180);
  const icon512 = await renderSquare(512);

  await writeFile(path.join(APP, "icon.png"), icon32);
  await writeFile(path.join(APP, "apple-icon.png"), icon180);

  const icoSizes = await Promise.all([16, 32, 48].map((s) => renderSquare(s)));
  const favicon = await pngToIco(icoSizes);
  await writeFile(path.join(APP, "favicon.ico"), favicon);

  const emblemForOg = await sharp(SVG)
    .resize(320, 494, { fit: "contain", background: BG })
    .png()
    .toBuffer();

  const og = await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: emblemForOg, gravity: "centre" }])
    .png()
    .toBuffer();

  await writeFile(path.join(APP, "opengraph-image.png"), og);
  await writeFile(path.join(ROOT, "public", "icon-512.png"), icon512);

  console.log("Generated app icons and opengraph-image.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
