import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { LocaleProvider } from "@/components/i18n/locale-provider";
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

  return (
    <ClerkProvider
      taskUrls={{
        "reset-password": "/reset-password",
      }}
    >
      <html lang={locale} className={`${montserrat.variable} h-full antialiased`}>
        <body className={`${montserrat.className} min-h-full flex flex-col`}>
          <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
