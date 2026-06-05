import crypto from "node:crypto";
import zlib from "node:zlib";
import { promisify } from "node:util";

const gunzip = promisify(zlib.gunzip);

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36";

// Extracted from OddsPortal app.js string table (after shuffle)
const PBKDF2_PASSWORD = "J*8sQ!p$7aD_fR2yW@gHn*3bVp#sAdLd_k";
const PBKDF2_SALT = "5b9a8f2c3e6d1a4b7c8e9d0f1a2b3c4d";

async function decryptOddsPortalPayload(base64Envelope) {
  const decoded = Buffer.from(base64Envelope, "base64").toString("utf8");
  const colon = decoded.indexOf(":");
  if (colon < 0) throw new Error("Invalid envelope: missing colon separator");

  const cipherB64 = decoded.slice(0, colon);
  const ivHex = decoded.slice(colon + 1);
  const iv = Buffer.from(ivHex, "hex");
  const ciphertext = Buffer.from(cipherB64, "base64");

  const key = crypto.pbkdf2Sync(
    PBKDF2_PASSWORD,
    PBKDF2_SALT,
    1000,
    32,
    "sha256",
  );

  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  const plain = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  if (plain.length >= 2 && plain[0] === 0x1f && plain[1] === 0x8b) {
    const inflated = await gunzip(plain);
    return inflated.toString("utf8");
  }
  return plain.toString("utf8");
}

function decodeHash(encoded) {
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

function buildMatchEventUrl(
  matchId,
  betType,
  scope,
  xhash,
  versionId = 1,
  sportId = 1,
) {
  const hash = decodeHash(xhash);
  return `https://www.oddsportal.com/match-event/${versionId}-${sportId}-${matchId}-${betType}-${scope}-${hash}.dat?_=${Date.now()}`;
}

async function fetchEncrypted(url, referer) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "application/json, text/plain, */*",
      Referer: referer,
      "X-Requested-With": "XMLHttpRequest",
    },
  });
  const text = await res.text();
  if (text.startsWith("URL:") || text.includes("Status: 404")) {
    throw new Error(`Feed error: ${text.slice(0, 120)}`);
  }
  return text;
}

function median(nums) {
  const arr = nums.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!arr.length) return null;
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
}

function parse1x2FromOddsData(data, scope = 2) {
  const back = data?.d?.oddsdata?.back ?? {};
  const keys = Object.keys(back).filter((k) => k.startsWith(`E-1-${scope}-0-0`));
  if (!keys.length) return null;

  const homeOdds = [];
  const drawOdds = [];
  const awayOdds = [];

  for (const k of keys) {
    const entry = back[k];
    const oddsMap = entry?.odds ?? {};
    for (const bookOdds of Object.values(oddsMap)) {
      if (!bookOdds || typeof bookOdds !== "object") continue;
      const o = bookOdds;
      if (o["0"] != null) homeOdds.push(Number(o["0"]));
      if (o["1"] != null) drawOdds.push(Number(o["1"]));
      if (o["2"] != null) awayOdds.push(Number(o["2"]));
    }
  }

  const h = median(homeOdds);
  const d = median(drawOdds);
  const a = median(awayOdds);
  if (h == null || d == null || a == null) return null;
  return { HOME: h, DRAW: d, AWAY: a };
}

function parseCorrectScore(data) {
  const back = data?.d?.oddsdata?.back ?? {};
  const out = {};
  for (const [marketKey, entry] of Object.entries(back)) {
    if (!marketKey.startsWith("E-8-2-0-0-")) continue;
    const suffix = marketKey.split("-").pop() ?? "";
    if (suffix.length !== 2 || !/^\d\d$/.test(suffix)) continue;
    const home = Number(suffix[0]);
    const away = Number(suffix[1]);
    if (home > 4 || away > 4) continue;
    const key = `${home}-${away}`;
    const oddsMap = entry?.odds ?? {};
    const vals = [];
    for (const bookOdds of Object.values(oddsMap)) {
      if (bookOdds?.["0"] != null) vals.push(Number(bookOdds["0"]));
    }
    const m = median(vals);
    if (m != null) out[key] = m;
  }
  return out;
}

async function main() {
  const matchId = "bo9vy2zK";
  const xhashf = "%79%6a%66%62%30"; // yjfb0 - used in requestPreMatch
  const referer =
    "https://www.oddsportal.com/football/world/world-championship-2026/paraguay-usa-bo9vy2zK/";

  const markets = [
    { name: "ft1x2", betType: 1, scope: 2 },
    { name: "ht1x2", betType: 1, scope: 3 },
    { name: "correctScore", betType: 8, scope: 2 },
  ];

  for (const m of markets) {
    const url = buildMatchEventUrl(matchId, m.betType, m.scope, xhashf);
    console.log(`\n=== ${m.name} ===`);
    console.log("URL:", url);
    const enc = await fetchEncrypted(url, referer);
    console.log("Encrypted prefix:", enc.slice(0, 60));
    const jsonText = await decryptOddsPortalPayload(enc);
    const data = JSON.parse(jsonText);
    console.log("Top keys:", Object.keys(data));
    if (data.d) console.log("d keys:", Object.keys(data.d));

    const backKeys = Object.keys(data?.d?.oddsdata?.back ?? {});
    console.log("back keys sample:", backKeys.slice(0, 12));

    if (m.name === "ft1x2" || m.name === "ht1x2") {
      const x = parse1x2FromOddsData(data, m.scope);
      console.log("1X2:", x);
    } else {
      const cs = parseCorrectScore(data);
      const sample = Object.entries(cs).slice(0, 8);
      console.log("Correct score count:", Object.keys(cs).length);
      console.log("Sample:", Object.fromEntries(sample));
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
