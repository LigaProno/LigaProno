import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import pngToIco from "png-to-ico";
import sharp from "sharp";

const ROOT = process.cwd();
const LOGO = path.join(ROOT, "public", "logo-liga-prono.png");
const APP = path.join(ROOT, "src", "app");
/** App shell background — favicon reads cleanly on light and dark browser chrome */
const BG = { r: 10, g: 11, b: 30, alpha: 1 };

async function renderSquare(size, inset = 0.9) {
  const inner = Math.max(1, Math.round(size * inset));
  const pad = Math.round((size - inner) / 2);

  return sharp(LOGO)
    .resize(inner, inner, { fit: "contain", background: BG })
    .extend({
      top: pad,
      bottom: size - inner - pad,
      left: pad,
      right: size - inner - pad,
      background: BG,
    })
    .png()
    .toBuffer();
}

async function main() {
  await mkdir(APP, { recursive: true });

  const icon32 = await renderSquare(32);
  const icon180 = await renderSquare(180, 0.92);
  const icon512 = await renderSquare(512, 0.92);

  await writeFile(path.join(APP, "icon.png"), icon32);
  await writeFile(path.join(APP, "apple-icon.png"), icon180);

  const icoSizes = await Promise.all([16, 32, 48].map((s) => renderSquare(s)));
  const favicon = await pngToIco(icoSizes);
  await writeFile(path.join(APP, "favicon.ico"), favicon);

  const emblemForOg = await sharp(LOGO)
    .resize(420, 420, { fit: "contain", background: BG })
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

  console.log("Generated favicon and app icons from logo-liga-prono.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
