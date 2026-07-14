import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import MemberPredictionsView from "@/components/party/member-predictions-view";
import { loadGlobalMemberPredictions } from "@/lib/global-leaderboard";
import { createTranslator } from "@/lib/i18n";
import { getLocaleFromCookies } from "@/lib/i18n/server";
import {
  fetchPublicTournamentsForNaming,
  resolveTournamentDisplayName,
} from "@/lib/public-tournaments";

export default async function GlobalMemberPredictionsPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId: memberUserId } = await params;
  const locale = await getLocaleFromCookies();
  const t = createTranslator(locale);

  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const data = await loadGlobalMemberPredictions(memberUserId);
  if (!data) notFound();

  const publicTournamentsForNaming = await fetchPublicTournamentsForNaming();
  const tournamentName = resolveTournamentDisplayName(
    { id: data.tournamentId, name: data.tournamentName, isPublic: publicTournamentsForNaming.some((pt) => pt.id === data.tournamentId) },
    publicTournamentsForNaming,
    (key) => t(key),
  );

  return (
    <MemberPredictionsView
      tournamentId={data.tournamentId}
      tournamentName={tournamentName}
      memberDisplayName={data.memberDisplayName}
      rows={data.rows}
      loadError={data.loadError}
      backHref="/turnee/clasament"
      backLabelKey="memberPred.backGlobal"
    />
  );
}
