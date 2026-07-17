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
}

async function assertAdmin() {
  const user = await requireDbUser();
  if (!isAdminEmail(user.email)) throw new I18nError("errors.notAuthenticated");
  return user;
}

export async function setSupportMessageStatus(
  messageId: string,
  status: "OPEN" | "DONE",
): Promise<void> {
  await assertAdmin();

  const next = status === "DONE" ? SupportStatus.DONE : SupportStatus.OPEN;

  await prisma.supportMessage.update({
    where: { id: messageId },
    data: { status: next, resolvedAt: next === SupportStatus.DONE ? new Date() : null },
  });

  revalidatePath("/admin");
}
