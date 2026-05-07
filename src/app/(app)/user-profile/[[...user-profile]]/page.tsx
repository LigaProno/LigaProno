import { UserProfile } from "@clerk/nextjs";

export default function UserProfilePage() {
  return (
    <div className="flex-1 flex items-start md:items-center justify-center p-3 sm:p-6">
      <UserProfile
        appearance={{
          variables: {
            colorBackground: "#1E293B",
            colorPrimary: "#22D3EE",
            colorText: "#FFFFFF",
            colorTextSecondary: "#FFFFFF",
            colorInputBackground: "#0F172A",
            colorInputText: "#FFFFFF",
            colorTextOnPrimaryBackground: "#0F172A",
            colorNeutral: "#FFFFFF",
            borderRadius: "0.75rem",
          },
          elements: {
            rootBox: "w-full max-w-4xl min-w-0",
            card: "w-full shadow-2xl border border-white/10",
            navbar: "border-r border-white/10",
            navbarButton: "!text-white hover:!bg-white/10",
            navbarButtonIcon: "!text-white",
            navbarButtonActive: "!text-white !bg-white/10",
            pageScrollBox: "!text-white",
            headerTitle: "!text-white font-bold",
            headerSubtitle: "!text-slate-300",
            profileSectionTitle: "!text-white font-semibold",
            profileSectionTitleText: "!text-white",
            profileSectionContent: "!text-white",
            profileSectionPrimaryButton: "!text-cyan-400 hover:!text-cyan-300",
            formFieldLabel: "!text-white text-sm font-medium",
            formFieldInput: "!border-white/15 !rounded-xl !text-white focus:!border-cyan-400",
            formButtonPrimary: "font-bold !rounded-xl hover:!opacity-90",
            formButtonReset: "!text-slate-300 hover:!text-white",
            badge: "!text-white",
            badgeLabel: "!text-white",
            tableHead: "!text-slate-300",
            accordionTriggerButton: "!text-white hover:!bg-white/10",
            identityPreviewText: "!text-white",
            identityPreviewEditButtonIcon: "!text-slate-300",
            userPreviewMainIdentifier: "!text-white font-semibold",
            userPreviewSecondaryIdentifier: "!text-slate-300",
            menuList: "!bg-[#1E293B] border border-white/10",
            menuItem: "!text-white hover:!bg-white/10",
            actionCard: "border border-white/10",
            alertText: "!text-white",
            formResendCodeLink: "!text-cyan-400",
          },
        }}
      />
    </div>
  );
}
