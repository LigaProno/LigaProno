import { sendEmail } from "@/lib/email/mailer";
import {
  renderSupportAdminNotifyEmail,
  renderSupportReceivedEmail,
  renderSupportReplyEmail,
  renderSupportResolvedEmail,
} from "@/lib/email/templates/support";
import type { SupportCategory } from "@prisma/client";

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

/** Nu aruncă — emailul nu trebuie să blocheze fluxul de support. */
async function safeSend(
  label: string,
  fn: () => Promise<{ ok: boolean; reason?: string }>,
): Promise<void> {
  try {
    const result = await fn();
    if (!result.ok) {
      console.error(`[email:support] ${label} failed:`, result.reason);
    }
  } catch (error) {
    console.error(`[email:support] ${label} error:`, error);
  }
}

export async function notifySupportTicketCreated(opts: {
  ticketId: string;
  name: string;
  email: string;
  category: SupportCategory;
  message: string;
}): Promise<void> {
  const received = renderSupportReceivedEmail({
    name: opts.name,
    category: opts.category,
    message: opts.message,
    ticketId: opts.ticketId,
  });

  await safeSend("received", () =>
    sendEmail({
      to: opts.email,
      subject: received.subject,
      html: received.html,
      text: received.text,
    }),
  );

  const adminTpl = renderSupportAdminNotifyEmail(opts);
  const admins = adminEmails();
  await Promise.all(
    admins.map((to) =>
      safeSend(`admin:${to}`, () =>
        sendEmail({
          to,
          subject: adminTpl.subject,
          html: adminTpl.html,
          text: adminTpl.text,
        }),
      ),
    ),
  );
}

export async function notifySupportReply(opts: {
  ticketId: string;
  name: string;
  email: string;
  category: SupportCategory;
  replyBody: string;
}): Promise<void> {
  const tpl = renderSupportReplyEmail({
    name: opts.name,
    category: opts.category,
    replyBody: opts.replyBody,
    ticketId: opts.ticketId,
  });

  await safeSend("reply", () =>
    sendEmail({
      to: opts.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    }),
  );
}

export async function notifySupportResolved(opts: {
  ticketId: string;
  name: string;
  email: string;
  category: SupportCategory;
}): Promise<void> {
  const tpl = renderSupportResolvedEmail({
    name: opts.name,
    category: opts.category,
    ticketId: opts.ticketId,
  });

  await safeSend("resolved", () =>
    sendEmail({
      to: opts.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    }),
  );
}

/** Sample-uri pentru preview / test. */
export async function sendSupportTestEmails(to: string) {
  const ticketId = "0000000000000000demo01";
  const received = renderSupportReceivedEmail({
    name: "Teodor",
    category: "QUESTION",
    message:
      "Salut! Nu reușesc să salvez pronosticul pentru meciul de seară. Butonul rămâne disabled după ce completez scorul.",
    ticketId,
  });
  const reply = renderSupportReplyEmail({
    name: "Teodor",
    category: "QUESTION",
    replyBody:
      "Mulțumim pentru semnalare. Am verificat — încearcă un refresh; dacă persistă, spune-ne ce browser folosești.",
    ticketId,
  });
  const resolved = renderSupportResolvedEmail({
    name: "Teodor",
    category: "QUESTION",
    ticketId,
  });
  const admin = renderSupportAdminNotifyEmail({
    name: "Teodor",
    email: to,
    category: "BUG",
    message: "Exemplu de bug raportat din formularul de support.",
    ticketId,
  });

  const prevTestTo = process.env.EMAIL_TEST_TO;
  delete process.env.EMAIL_TEST_TO;
  try {
    const [r1, r2, r3, r4] = await Promise.all([
      sendEmail({ to, subject: received.subject, html: received.html, text: received.text }),
      sendEmail({ to, subject: reply.subject, html: reply.html, text: reply.text }),
      sendEmail({ to, subject: resolved.subject, html: resolved.html, text: resolved.text }),
      sendEmail({ to, subject: admin.subject, html: admin.html, text: admin.text }),
    ]);
    return { received: r1, reply: r2, resolved: r3, adminNotify: r4 };
  } finally {
    if (prevTestTo != null) process.env.EMAIL_TEST_TO = prevTestTo;
  }
}
