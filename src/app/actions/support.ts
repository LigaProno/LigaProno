"use server";

import { auth } from "@clerk/nextjs/server";
import nodemailer from "nodemailer";
import { I18nError } from "@/lib/i18n/errors";

export async function sendSupportEmail(formData: {
  name: string;
  email: string;
  category: string;
  message: string;
}): Promise<void> {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new I18nError("errors.notAuthenticated");

  const { name, email, category, message } = formData;

  if (!name.trim() || !email.trim() || !category || !message.trim()) {
    throw new Error("Toate câmpurile sunt obligatorii.");
  }
  if (message.trim().length < 10) {
    throw new Error("Mesajul este prea scurt (minim 10 caractere).");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const categoryLabel: Record<string, string> = {
    bug: "Raport bug",
    question: "Întrebare",
    suggestion: "Sugestie",
    other: "Altele",
  };

  await transporter.sendMail({
    from: `"Liga Prono Support" <${process.env.EMAIL_USER}>`,
    to: "Liga Prono6767@gmail.com",
    replyTo: email.trim(),
    subject: `[Liga Prono] ${categoryLabel[category] ?? category} — ${name.trim()}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#22D3EE;margin-bottom:4px">Liga Prono Support</h2>
        <p style="color:#888;font-size:13px;margin-top:0">${new Date().toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" })}</p>
        <table style="border-collapse:collapse;width:100%;margin-top:16px">
          <tr><td style="padding:8px 0;color:#888;width:100px">Nume</td><td style="padding:8px 0;font-weight:600">${name.trim()}</td></tr>
          <tr><td style="padding:8px 0;color:#888">Email</td><td style="padding:8px 0"><a href="mailto:${email.trim()}">${email.trim()}</a></td></tr>
          <tr><td style="padding:8px 0;color:#888">Categorie</td><td style="padding:8px 0">${categoryLabel[category] ?? category}</td></tr>
        </table>
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
        <p style="white-space:pre-wrap;line-height:1.6">${message.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
      </div>
    `,
  });
}
