import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import MemberPredictionsView from "@/components/party/member-predictions-view";
import { loadGlobalMemberPredictions } from "@/lib/global-leaderboard";

export default async function GlobalMemberPredictionsPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId: memberUserId } = await params;

  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const data = await loadGlobalMemberPredictions(memberUserId);
  if (!data) notFound();

  return (
    <MemberPredictionsView
      tournamentId={data.tournamentId}
      tournamentName={data.tournamentName}
      memberDisplayName={data.memberDisplayName}
      championPick={data.championPick}
      advancingCount={data.advancingCount}
      rows={data.rows}
      loadError={data.loadError}
      backHref="/turnee/clasament"
      backLabelKey="memberPred.backGlobal"
    />
  );
}
