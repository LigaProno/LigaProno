import { PageLoading } from "@/components/ui/page-loading";

export default function TurneeListLoading() {
  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] w-full items-center justify-center md:min-h-screen">
      <PageLoading />
    </div>
  );
}
