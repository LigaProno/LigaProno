import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

export default async function DashboardPage() {
  const { userId } = await auth();

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-foreground/10 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
            <svg
              className="w-4 h-4 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="font-bold text-lg text-foreground">PronoHub</span>
        </div>
        <UserButton />
      </header>

      <div className="px-4 sm:px-6 lg:px-8 py-12 max-w-4xl mx-auto text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
          Welcome to PronoHub
        </h1>
        <p className="text-foreground/60">
          You&apos;re signed in. Your dashboard is coming soon.
        </p>
        <p className="text-xs text-foreground/40 mt-2">User ID: {userId}</p>
      </div>
    </main>
  );
}
