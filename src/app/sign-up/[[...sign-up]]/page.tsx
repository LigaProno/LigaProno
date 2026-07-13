import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";

export default function SignUpPage() {
  return (
    <AuthPageShell subtitle="Creează-ți contul și intră în joc">
      <SignUpForm />
    </AuthPageShell>
  );
}
