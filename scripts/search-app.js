import fs from "node:fs";

const js = fs.readFileSync(new URL("./op-app.js", import.meta.url), "utf8");
const patterns = [
  "h(r.data",
  "oddsdata",
  "match-event",
  "PBKDF2",
  "pbkdf2",
  "CryptoJS",
  "Salted__",
  "decryptData",
  "decodeData",
  "xhash",
  "OpenSSL",
  "AES",
  "CBC",
  "createDecipher",
];

for (const p of patterns) {
  let idx = 0;
  let count = 0;
  while ((idx = js.indexOf(p, idx)) >= 0 && count < 3) {
    console.log(`\n=== ${p} @ ${idx} ===`);
    console.log(js.slice(Math.max(0, idx - 80), idx + 200));
    idx += p.length;
    count++;
  }
  if (count === 0) console.log(`${p}: NOT FOUND`);
}

const hMatches = [...js.matchAll(/h\(\w+\.data,"([^"]{4,64})","([^"]{4,64})"\)/g)];
console.log("\nh(data) matches:", hMatches.length);
for (const m of hMatches.slice(0, 5)) {
  console.log(m[1], m[2]);
}
