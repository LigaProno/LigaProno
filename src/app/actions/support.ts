"use server";

import { SupportCategory, SupportStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { isAdminEmail } from "@/lib/admin";
import { I18nError } from "@/lib/i18n/errors";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/lib/sync-clerk-user";

/** Valorile din formular (lowercase) → enum-ul Prisma. */
const CATEGORY_BY_FORM_VALUE: Record<string, SupportCategory> = {
  bug: SupportCategory.BUG,
  question: SupportCategory.QUESTION,
  suggestion: SupportCategory.SUGGESTION,
  other: SupportCategory.OTHER,
};

export async function sendSupportEmail(formData: {
  name: string;
  email: string;
  category: string;
  message: string;
}): Promise<void> {
  const user = await requireDbUser();

  const name = formData.name.trim();
  const email = formData.email.trim();
  const message = formData.message.trim();

  if (!name || !email || !formData.category || !message) {
    throw new Error("Toate câmpurile sunt obligatorii.");
  }
  if (message.length < 10) {
    throw new Error("Mesajul este prea scurt (minim 10 caractere).");
  }

  const category = CATEGORY_BY_FORM_VALUE[formData.category];
  if (!category) throw new Error("Categorie invalidă.");

  await prisma.supportMessage.create({
    data: { userId: user.id, name, email, category, message },
  });

  revalidatePath("/admin");
  revalidatePath("/support");
}

async function assertAdmin() {
  const user = await requireDbUser();
  if (!isAdminEmail(user.email)) throw new I18nError("errors.notAuthenticated");
  return user;
}

export async function setSupportMessageStatus(
  messageId: string,
  status: "OPEN" | "SEEN" | "DONE",
): Promise<void> {
  await assertAdmin();

  const now = new Date();
  const existing = await prisma.supportMessage.findUnique({
    where: { id: messageId },
    select: { seenAt: true },
  });

  const data =
    status === "DONE"
      ? { status: SupportStatus.DONE, seenAt: existing?.seenAt ?? now, resolvedAt: now }
      : status === "SEEN"
        ? { status: SupportStatus.SEEN, seenAt: existing?.seenAt ?? now, resolvedAt: null }
        : { status: SupportStatus.OPEN, seenAt: null, resolvedAt: null };

  await prisma.supportMessage.update({ where: { id: messageId }, data });

  revalidatePath("/admin");
  revalidatePath("/support");
}

/** Șterge un tichet + comentariile lui (MongoDB nu are cascade). */
async function purgeTicket(messageId: string): Promise<void> {
  await prisma.supportComment.deleteMany({ where: { messageId } });
  await prisma.supportMessage.delete({ where: { id: messageId } });
}

/** Userul își poate șterge propriul tichet doar dacă e rezolvat. */
export async function deleteMySupportTicket(messageId: string): Promise<void> {
  const user = await requireDbUser();

  const ticket = await prisma.supportMessage.findUnique({
    where: { id: messageId },
    select: { userId: true, status: true },
  });
  if (!ticket) throw new Error("Tichet inexistent.");
  if (ticket.userId !== user.id) throw new Error("Nu poți șterge acest tichet.");
  if (ticket.status !== SupportStatus.DONE) {
    throw new Error("Poți șterge doar tichetele rezolvate.");
  }

  await purgeTicket(messageId);
  revalidatePath("/support");
  revalidatePath("/admin");
}

/** Adminul poate șterge orice tichet. */
export async function deleteSupportTicketAsAdmin(messageId: string): Promise<void> {
  await assertAdmin();
  await purgeTicket(messageId);
  revalidatePath("/admin");
  revalidatePath("/support");
}

/** Admin adaugă un răspuns pe tichet; userul îl vede în pagina de support. */
export async function addSupportComment(messageId: string, body: string): Promise<void> {
  await assertAdmin();

  const text = body.trim();
  if (!text) throw new Error("Comentariul nu poate fi gol.");

  const ticket = await prisma.supportMessage.findUnique({
    where: { id: messageId },
    select: { id: true, seenAt: true, status: true },
  });
  if (!ticket) throw new Error("Tichet inexistent.");

  await prisma.supportComment.create({ data: { messageId, body: text } });

  // Un răspuns înseamnă implicit că l-am văzut — trece OPEN → SEEN.
  if (ticket.status === SupportStatus.OPEN) {
    await prisma.supportMessage.update({
      where: { id: messageId },
      data: { status: SupportStatus.SEEN, seenAt: ticket.seenAt ?? new Date() },
    });
  }

  revalidatePath("/admin");
  revalidatePath("/support");
}
