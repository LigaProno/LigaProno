import "dotenv/config";
import { sendSupportTestEmails } from "../src/lib/email/support-notify";

async function main() {
  const to = process.argv[2] || "rizon.teodor@gmail.com";
  console.log("Sending support test emails to", to);
  const result = await sendSupportTestEmails(to);
  console.log(JSON.stringify(result, null, 2));
  const failed = Object.values(result).some((r) => !r.ok);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
