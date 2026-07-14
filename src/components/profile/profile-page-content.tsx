"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  deleteUserAccountData,
  getFavoriteTeamOptions,
  getProfileData,
  syncProfileFields,
  updateFavoriteTeam,
  type ProfileCompetitionOption,
  type ProfileData,
  type ProfileTeamOption,
} from "@/app/actions/profile";
import { DEFAULT_FAVORITE_TEAM_COMPETITION } from "@/lib/favorite-team";
import { useLocale } from "@/components/i18n/locale-provider";
import { FavoriteTeamPicker } from "@/components/profile/favorite-team-picker";
import {
  ProfileAlert,
  ProfileButton,
  ProfileField,
  ProfileInput,
  ProfileSection,
} from "@/components/profile/profile-ui";
import { getClerkErrorMessage } from "@/lib/clerk-errors";

export function ProfilePageContent({
  initialProfile,
  initialTeams,
  competitions,
}: {
  initialProfile: ProfileData;
  initialTeams: ProfileTeamOption[];
  competitions: ProfileCompetitionOption[];
}) {
  const { t, locale } = useLocale();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const searchParams = useSearchParams();
  const onboarding = searchParams.get("onboarding") === "1";

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState(initialProfile);
  const [firstName, setFirstName] = useState(initialProfile.firstName ?? "");
  const [lastName, setLastName] = useState(initialProfile.lastName ?? "");
  const [favoriteTeamId, setFavoriteTeamId] = useState<number | null>(initialProfile.favoriteTeamId);
  const [favoriteCompetition, setFavoriteCompetition] = useState(
    initialProfile.favoriteTeamCompetition ?? DEFAULT_FAVORITE_TEAM_COMPETITION,
  );
  const [teams, setTeams] = useState(initialTeams);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const [nameSaving, setNameSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [teamSaving, setTeamSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const [nameMessage, setNameMessage] = useState<string>();
  const [avatarMessage, setAvatarMessage] = useState<string>();
  const [teamMessage, setTeamMessage] = useState<string>();
  const [passwordMessage, setPasswordMessage] = useState<string>();
  const [deleteMessage, setDeleteMessage] = useState<string>();

  useEffect(() => {
    if (!isLoaded || !user) return;
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
  }, [isLoaded, user]);

  const dateLocale = locale === "ro" ? "ro-RO" : "en-GB";
  const memberSince = new Date(profile.createdAt).toLocaleDateString(dateLocale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const displayImage = user?.imageUrl ?? profile.imageUrl ?? undefined;
  const displayName =
    [user?.firstName ?? profile.firstName, user?.lastName ?? profile.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || profile.email;

  const handleSaveName = async () => {
    if (!user) return;
    setNameSaving(true);
    setNameMessage(undefined);
    try {
      await user.update({ firstName: firstName.trim() || undefined, lastName: lastName.trim() || undefined });
      await syncProfileFields({
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
      });
      const refreshed = await getProfileData();
      setProfile(refreshed);
      setNameMessage(t("profile.saved"));
    } catch (err) {
      setNameMessage(getClerkErrorMessage(err) ?? t("errors.generic"));
    } finally {
      setNameSaving(false);
    }
  };

  const handleAvatarChange = async (file: File | null) => {
    if (!user || !file) return;
    setAvatarSaving(true);
    setAvatarMessage(undefined);
    try {
      await user.setProfileImage({ file });
      await syncProfileFields({ imageUrl: user.imageUrl });
      const refreshed = await getProfileData();
      setProfile(refreshed);
      setAvatarMessage(t("profile.avatarUpdated"));
    } catch (err) {
      setAvatarMessage(getClerkErrorMessage(err) ?? t("errors.generic"));
    } finally {
      setAvatarSaving(false);
    }
  };

  const handleCompetitionChange = async (storageKey: string) => {
    setFavoriteCompetition(storageKey);
    setFavoriteTeamId(null);
    setTeamMessage(undefined);
    setTeamsLoading(true);
    try {
      const nextTeams = await getFavoriteTeamOptions(storageKey);
      setTeams(nextTeams);
    } catch {
      setTeams([]);
      setTeamMessage(t("errors.generic"));
    } finally {
      setTeamsLoading(false);
    }
  };

  const handleSaveTeam = async () => {
    if (favoriteTeamId == null) {
      setTeamMessage(t("profile.favoriteTeam.required"));
      return;
    }
    setTeamSaving(true);
    setTeamMessage(undefined);
    try {
      await updateFavoriteTeam(favoriteCompetition, favoriteTeamId);
      const refreshed = await getProfileData();
      setProfile(refreshed);
      setTeamMessage(t("profile.saved"));
      if (onboarding) {
        router.replace("/dashboard");
      }
    } catch {
      setTeamMessage(t("errors.generic"));
    } finally {
      setTeamSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.passwordEnabled) return;
    if (newPassword.length < 8) {
      setPasswordMessage(t("profile.password.tooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage(t("profile.password.mismatch"));
      return;
    }
    setPasswordSaving(true);
    setPasswordMessage(undefined);
    try {
      await user.updatePassword({
        currentPassword,
        newPassword,
        signOutOfOtherSessions: false,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage(t("profile.password.updated"));
    } catch (err) {
      setPasswordMessage(getClerkErrorMessage(err) ?? t("errors.generic"));
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    if (deleteConfirm.trim().toUpperCase() !== t("profile.delete.confirmWord")) {
      setDeleteMessage(t("profile.delete.confirmHint"));
      return;
    }
    setDeleteSaving(true);
    setDeleteMessage(undefined);
    try {
      await deleteUserAccountData();
      await user.delete();
      await signOut({ redirectUrl: "/" });
    } catch (err) {
      setDeleteMessage(getClerkErrorMessage(err) ?? t("errors.generic"));
      setDeleteSaving(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="auth-skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 space-y-6">
      <header className="mb-2">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          {onboarding ? t("profile.onboarding.title") : t("profile.title")}
        </h1>
        <p className="mt-1 text-sm text-white/45">
          {onboarding ? t("profile.onboarding.subtitle") : t("profile.subtitle")}
        </p>
      </header>

      <ProfileSection title={t("profile.identity.title")} description={t("profile.identity.description")}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex flex-col items-center gap-3 sm:items-start">
            <div
              className="relative h-24 w-24 overflow-hidden rounded-2xl border"
              style={{ borderColor: "rgba(197,160,89,0.35)" }}
            >
              {displayImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={displayImage} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-white/5 text-2xl font-bold text-white/50">
                  {displayName.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void handleAvatarChange(e.target.files?.[0] ?? null)}
            />
            <ProfileButton
              variant="ghost"
              loading={avatarSaving}
              onClick={() => fileInputRef.current?.click()}
            >
              {t("profile.avatar.change")}
            </ProfileButton>
            {avatarMessage ? (
              <ProfileAlert
                message={avatarMessage}
                tone={avatarMessage === t("profile.avatarUpdated") ? "success" : "error"}
              />
            ) : null}
          </div>

          <div className="flex-1 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <ProfileField label={t("profile.firstName")}>
                <ProfileInput
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                />
              </ProfileField>
              <ProfileField label={t("profile.lastName")}>
                <ProfileInput
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                />
              </ProfileField>
            </div>
            <ProfileField label={t("profile.email")} value={profile.email} />
            <div className="flex flex-wrap items-center gap-3">
              <ProfileButton loading={nameSaving} onClick={() => void handleSaveName()}>
                {t("common.save")}
              </ProfileButton>
              {nameMessage ? (
                <ProfileAlert
                  message={nameMessage}
                  tone={nameMessage === t("profile.saved") ? "success" : "error"}
                />
              ) : null}
            </div>
          </div>
        </div>
      </ProfileSection>

      <ProfileSection
        title={t("profile.favoriteTeam.title")}
        description={t("profile.favoriteTeam.description")}
      >
        <FavoriteTeamPicker
          competitions={competitions}
          competitionKey={favoriteCompetition}
          onCompetitionChange={(key) => void handleCompetitionChange(key)}
          teams={teams}
          teamsLoading={teamsLoading}
          value={favoriteTeamId}
          onChange={setFavoriteTeamId}
          disabled={teamSaving}
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <ProfileButton loading={teamSaving} onClick={() => void handleSaveTeam()}>
            {onboarding ? t("profile.onboarding.continue") : t("common.save")}
          </ProfileButton>
          {teamMessage ? (
            <ProfileAlert
              message={teamMessage}
              tone={teamMessage === t("profile.saved") ? "success" : "error"}
            />
          ) : null}
        </div>
      </ProfileSection>

      {!onboarding && user?.passwordEnabled ? (
        <ProfileSection title={t("profile.password.title")} description={t("profile.password.description")}>
          <form onSubmit={(e) => void handlePasswordChange(e)} className="space-y-4 max-w-md">
            <ProfileField label={t("profile.password.current")}>
              <ProfileInput
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </ProfileField>
            <ProfileField label={t("profile.password.new")}>
              <ProfileInput
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </ProfileField>
            <ProfileField label={t("profile.password.confirm")}>
              <ProfileInput
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </ProfileField>
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className="app-btn-primary" disabled={passwordSaving}>
                {passwordSaving ? t("common.loading") : t("profile.password.submit")}
              </button>
              {passwordMessage ? (
                <ProfileAlert
                  message={passwordMessage}
                  tone={passwordMessage === t("profile.password.updated") ? "success" : "error"}
                />
              ) : null}
            </div>
          </form>
        </ProfileSection>
      ) : null}

      {!onboarding ? (
        <ProfileSection title={t("profile.account.title")}>
          <ProfileField label={t("profile.memberSince")} value={memberSince} />
          {user?.externalAccounts?.length ? (
            <div className="mt-4">
              <ProfileField
                label={t("profile.connectedAccounts")}
                value={user.externalAccounts.map((a) => a.provider).join(", ")}
              />
            </div>
          ) : null}
        </ProfileSection>
      ) : null}

      {!onboarding && user?.deleteSelfEnabled !== false ? (
        <ProfileSection title={t("profile.delete.title")} description={t("profile.delete.description")}>
          <div className="max-w-md space-y-4">
            <ProfileField label={t("profile.delete.typeConfirm")}>
              <ProfileInput
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={t("profile.delete.confirmWord")}
                autoComplete="off"
              />
            </ProfileField>
            {deleteMessage ? <ProfileAlert message={deleteMessage} /> : null}
            <ProfileButton variant="danger" loading={deleteSaving} onClick={() => void handleDeleteAccount()}>
              {t("profile.delete.submit")}
            </ProfileButton>
          </div>
        </ProfileSection>
      ) : null}
    </div>
  );
}
