import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing/landing-page";
import { pageTitle } from "@/lib/site-metadata";

export const metadata = pageTitle("Liga Prono — Pronosticuri sportive");

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return <LandingPage />;
}
