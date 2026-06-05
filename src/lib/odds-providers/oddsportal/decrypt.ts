import crypto from "node:crypto";
import { gunzipSync } from "node:zlib";

/** Valori extrase din bundle-ul OddsPortal (`app-*.js`); se pot suprascrie via env. */
const DEFAULT_PASSWORD = "J*8sQ!p$7aD_fR2yW@gHn*3bVp#sAdLd_k";
const DEFAULT_SALT = "5b9a8f2c3e6d1a4b7c8e9d0f1a2b3c4d";

function getPassword(): string {
  return process.env.ODDSPORTAL_DECRYPT_PASSWORD?.trim() || DEFAULT_PASSWORD;
}

function getSalt(): string {
  return process.env.ODDSPORTAL_DECRYPT_SALT?.trim() || DEFAULT_SALT;
}

/** Decriptează payload-ul base64 returnat de feed-urile OddsPortal (AES-256-CBC + PBKDF2). */
export function decryptOddsPortalPayload(base64Envelope: string): string {
  const decoded = Buffer.from(base64Envelope, "base64").toString("utf8");
  const colon = decoded.indexOf(":");
  if (colon < 0) {
    throw new Error("OddsPortal: format criptat invalid (lipsește separatorul ':').");
  }

  const cipherB64 = decoded.slice(0, colon);
  const ivHex = decoded.slice(colon + 1);
  const iv = Buffer.from(ivHex, "hex");
  const ciphertext = Buffer.from(cipherB64, "base64");

  const key = crypto.pbkdf2Sync(getPassword(), getSalt(), 1000, 32, "sha256");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  if (plain.length >= 2 && plain[0] === 0x1f && plain[1] === 0x8b) {
    return gunzipSync(plain).toString("utf8");
  }
  return plain.toString("utf8");
}

export async function fetchAndDecryptJson(url: string, referer: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": process.env.ODDSPORTAL_USER_AGENT?.trim() || DEFAULT_USER_AGENT,
      Accept: "application/json, text/plain, */*",
      Referer: referer,
      "X-Requested-With": "XMLHttpRequest",
    },
    signal: AbortSignal.timeout(30_000),
  });

  const text = await res.text();
  if (!res.ok || text.startsWith("URL:") || text.includes("Status: 404")) {
    throw new Error(`OddsPortal HTTP ${res.status}: ${text.slice(0, 120)}`);
  }

  const jsonText = decryptOddsPortalPayload(text);
  return JSON.parse(jsonText) as unknown;
}

export const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36";

export const ODDSPORTAL_BASE = "https://www.oddsportal.com";
