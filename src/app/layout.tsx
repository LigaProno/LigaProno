import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin", "latin-ext"],
  variable: "--font-montserrat",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "PronoHub",
  description: "Your ultimate sports prediction hub",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="ro" className={`${montserrat.variable} h-full antialiased`}>
        <body className={`${montserrat.className} min-h-full flex flex-col`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
