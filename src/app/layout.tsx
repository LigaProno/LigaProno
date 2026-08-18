import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { cookies } from "next/headers";
import { ClerkProvider } from "@clerk/nextjs";
import { RememberMeGuard } from "@/components/auth/remember-me-guard";
import { CookieConsentProvider } from "@/components/consent/cookie-consent-provider";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { COOKIE_CONSENT_NAME, parseCookieConsent } from "@/lib/cookie-consent";
import { getLocaleFromCookies } from "@/lib/i18n/server";
import { buildRootMetadata } from "@/lib/site-metadata";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin", "latin-ext"],
  variable: "--font-montserrat",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = buildRootMetadata();

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocaleFromCookies();
  const cookieConsent = parseCookieConsent(
    (await cookies()).get(COOKIE_CONSENT_NAME)?.value,
  );

  return (
    <ClerkProvider
      taskUrls={{
        "reset-password": "/reset-password",
      }}
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/profil?onboarding=1"
      afterSignOutUrl="/"
    >
      <html lang={locale} className={`${montserrat.variable} h-full antialiased`}>
        <body className={`${montserrat.className} min-h-full flex flex-col`}>
          <LocaleProvider initialLocale={locale}>
            <CookieConsentProvider initialConsent={cookieConsent}>
              <RememberMeGuard />
              {children}
            </CookieConsentProvider>
          </LocaleProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
