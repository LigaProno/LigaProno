import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { RedirectIfSignedIn } from "@/components/auth/redirect-if-signed-in";
import { SignUpForm } from "@/components/auth/sign-up-form";

export default async function SignUpPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <AuthPageShell subtitle="Creează-ți contul și intră în joc">
      <RedirectIfSignedIn to="/profil?onboarding=1" />
      <SignUpForm />
    </AuthPageShell>
  );
}
