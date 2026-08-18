"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/lib/sync-clerk-user";

export type ConsentStatus = {
  authenticated: boolean;
  termsAccepted: boolean;
  marketingConsent: boolean | null;
};

export async function getConsentStatus(): Promise<ConsentStatus> {
  try {
    const user = await requireDbUser();
    const row = user as {
      termsAccepted?: boolean | null;
      marketingConsent?: boolean | null;
    };
    return {
      authenticated: true,
      termsAccepted: row.termsAccepted === true,
      marketingConsent: row.marketingConsent ?? null,
    };
  } catch {
    return {
      authenticated: false,
      termsAccepted: false,
      marketingConsent: null,
    };
  }
}

export async function saveConsent(data: {
  termsAccepted: boolean;
  marketingConsent?: boolean;
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
        ...(data.marketingConsent !== undefined
          ? {
              marketingConsent: data.marketingConsent,
              marketingConsentAt: now,
            }
          : {}),
      },
    });

    revalidatePath("/");
    revalidatePath("/profil");
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

    revalidatePath("/");
    revalidatePath("/profil");
    return { ok: true };
  } catch (e) {
    console.error("[consent] Error updating marketing consent:", e);
    return { ok: false, error: "Eroare la salvare. Încearcă din nou." };
  }
}
