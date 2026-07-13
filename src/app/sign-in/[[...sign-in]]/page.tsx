import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { SignInForm } from "@/components/auth/sign-in-form";

export default function SignInPage() {
  return (
    <AuthPageShell subtitle="Intră în cont și urmărește competiția">
      <SignInForm />
    </AuthPageShell>
  );
}
