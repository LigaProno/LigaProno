"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { saveCookieConsent } from "@/app/actions/cookie-consent";
import type { CookieConsent } from "@/lib/cookie-consent";
import { CookieConsentBanner } from "./cookie-consent-banner";
import { MetaPixel } from "./meta-pixel";

type CookieConsentContextValue = {
  consent: CookieConsent | null;
  openSettings: () => void;
};

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

export function CookieConsentProvider({
  initialConsent,
  children,
}: {
  initialConsent: CookieConsent | null;
  children: ReactNode;
}) {
  const [consent, setConsent] = useState(initialConsent);
  const [settingsOpen, setSettingsOpen] = useState(!initialConsent);

  const openSettings = useCallback(() => setSettingsOpen(true), []);

  const save = useCallback(async (advertising: boolean) => {
    const result = await saveCookieConsent(advertising);
    if (!result.ok) return result;
    setConsent(result.consent);
    setSettingsOpen(false);
    return result;
  }, []);

  const value = useMemo(
    () => ({ consent, openSettings }),
    [consent, openSettings],
  );

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
      <MetaPixel enabled={consent?.advertising === true} />
      <CookieConsentBanner
        open={settingsOpen}
        hasExistingConsent={consent != null}
        advertising={consent?.advertising ?? false}
        onClose={() => {
          if (consent) setSettingsOpen(false);
        }}
        onSave={save}
      />
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) {
    throw new Error("useCookieConsent must be used within CookieConsentProvider");
  }
  return ctx;
}
