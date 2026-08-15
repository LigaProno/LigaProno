"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/lib/sync-clerk-user";

export type ConsentStatus = {
  termsAccepted: boolean;
  marketingConsent: boolean | null;
};

export async function getConsentStatus(): Promise<ConsentStatus> {
  try {
    const user = await requireDbUser();
    return {
      termsAccepted: (user as { termsAccepted?: boolean }).termsAccepted ?? false,
      marketingConsent: (user as { marketingConsent?: boolean | null }).marketingConsent ?? null,
    };
  } catch {
    return {
      termsAccepted: false,
      marketingConsent: null,
    };
  }
}

export async function saveConsent(data: {
  termsAccepted: boolean;
  marketingConsent: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requireDbUser();

    if (!data.termsAccepted) {
      return { ok: false, error: "Trebuie să accepți termenii și condițiile." };
    }

    const now = new Date();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        termsAccepted: true,
        termsAcceptedAt: now,
        marketingConsent: data.marketingConsent,
        marketingConsentAt: now,
      },
    });

    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    console.error("[consent] Error saving consent:", e);
    return { ok: false, error: "Eroare la salvare. Încearcă din nou." };
  }
}

export async function updateMarketingConsent(
  consent: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requireDbUser();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        marketingConsent: consent,
        marketingConsentAt: new Date(),
      },
    });

    revalidatePath("/profil");
    return { ok: true };
  } catch (e) {
    console.error("[consent] Error updating marketing consent:", e);
    return { ok: false, error: "Eroare la salvare. Încearcă din nou." };
  }
}
