import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <AuthPageShell subtitle="Setează o parolă nouă pentru contul tău">
      <ResetPasswordForm />
    </AuthPageShell>
  );
}
