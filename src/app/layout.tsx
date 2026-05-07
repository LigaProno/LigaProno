import type { Metadata } from "next";
import localFont from "next/font/local";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const novarese = localFont({
  src: [
    {
      path: "../fonts/ITC-Novarese-Book.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/ITC-Novarese-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../fonts/ITC-Novarese-Ultra.ttf",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-novarese",
  display: "swap",
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
      <html lang="en" className={`${novarese.variable} h-full antialiased`}>
        <body className="min-h-full flex flex-col font-[family-name:var(--font-novarese)]">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
