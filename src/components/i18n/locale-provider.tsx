"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { setLocale as setLocaleAction } from "@/app/actions/locale";
import {
  createTranslator,
  dateLocaleFor,
  type Locale,
  type MessageKey,
} from "@/lib/i18n";

type LocaleContextValue = {
  locale: Locale;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
  dateLocale: string;
  setLocale: (locale: Locale) => Promise<void>;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState(initialLocale);

  const t = useMemo(() => createTranslator(locale), [locale]);
  const dateLocale = useMemo(() => dateLocaleFor(locale), [locale]);

  const setLocale = useCallback(
    async (next: Locale) => {
      if (next === locale) return;
      setLocaleState(next);
      await setLocaleAction(next);
      router.refresh();
    },
    [locale, router],
  );

  const value = useMemo(
    () => ({ locale, t, dateLocale, setLocale }),
    [locale, t, dateLocale, setLocale],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}
