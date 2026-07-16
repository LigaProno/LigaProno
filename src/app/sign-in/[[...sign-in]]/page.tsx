import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { RedirectIfSignedIn } from "@/components/auth/redirect-if-signed-in";
import { SignInForm } from "@/components/auth/sign-in-form";

export default async function SignInPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <AuthPageShell subtitle="Intră în cont și urmărește competiția">
      <RedirectIfSignedIn />
      <SignInForm />
    </AuthPageShell>
  );
}
