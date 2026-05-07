import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main
      className="min-h-screen flex items-center justify-center p-4 page-transition"
      style={{ backgroundColor: "#0F172A" }}
    >
      <SignUp
        appearance={{
          variables: {
            colorBackground: "#1E293B",
            colorPrimary: "#22D3EE",
            colorText: "#FFFFFF",
            colorTextSecondary: "#CBD5E1",
            colorInputBackground: "#0F172A",
            colorInputText: "#FFFFFF",
            colorTextOnPrimaryBackground: "#0F172A",
            borderRadius: "0.75rem",
          },
          elements: {
            rootBox: "w-full max-w-md",
            card: "w-full shadow-2xl border border-white/10",
            headerTitle: "!text-white font-bold text-xl",
            headerSubtitle: "!text-slate-300",
            socialButtonsBlockButton:
              "border border-white/15 hover:bg-white/10 transition-colors rounded-xl",
            socialButtonsBlockButtonText: "!text-white font-medium",
            socialButtonsBlockButtonArrow: "!text-white",
            dividerLine: "bg-white/10",
            dividerText: "!text-slate-400 text-xs",
            formFieldLabel: "!text-slate-200 text-sm font-medium",
            formFieldInput:
              "border border-white/15 rounded-xl !text-white placeholder:!text-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400",
            formButtonPrimary:
              "font-bold text-base rounded-xl transition-all hover:opacity-90",
            footerActionText: "!text-slate-300",
            footerActionLink: "!text-cyan-400 font-semibold hover:!text-cyan-300",
            formFieldSuccessText: "!text-lime-400",
            formFieldErrorText: "!text-red-400",
            alertText: "!text-white",
          },
        }}
      />
    </main>
  );
}
