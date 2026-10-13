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
  DEFAULT_LOCALE,
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

const fallbackLocale: LocaleContextValue = {
  locale: DEFAULT_LOCALE,
  t: createTranslator(DEFAULT_LOCALE),
  dateLocale: dateLocaleFor(DEFAULT_LOCALE),
  setLocale: async (next) => {
    await setLocaleAction(next);
  },
};

/** `useRouter()` aruncă dacă App Router nu e montat încă. Contextul de limbă trebuie să existe oricum. */
function useOptionalRouter() {
  try {
    return useRouter();
  } catch {
    return null;
  }
}

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const router = useOptionalRouter();
  const [locale, setLocaleState] = useState(initialLocale);

  const t = useMemo(() => createTranslator(locale), [locale]);
  const dateLocale = useMemo(() => dateLocaleFor(locale), [locale]);

  const setLocale = useCallback(
    async (next: Locale) => {
      if (next === locale) return;
      setLocaleState(next);
      await setLocaleAction(next);
      router?.refresh();
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
  return useContext(LocaleContext) ?? fallbackLocale;
}
