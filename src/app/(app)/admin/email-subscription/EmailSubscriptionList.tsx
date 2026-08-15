"use client";

import { useState, useEffect, useTransition } from "react";
import { getSubscribedUsers, type SubscribedUser } from "@/app/actions/admin";

export default function EmailSubscriptionList() {
  const [users, setUsers] = useState<SubscribedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isPending, startTransition] = useTransition();

  const PAGE_SIZE = 20;

  useEffect(() => {
    loadUsers(0);
  }, []);

  const loadUsers = (pageNum: number) => {
    setLoading(true);
    startTransition(async () => {
      const result = await getSubscribedUsers({
        skip: pageNum * PAGE_SIZE,
        take: PAGE_SIZE + 1,
        search: searchQuery.trim() || undefined,
      });
      const hasNextPage = result.length > PAGE_SIZE;
      setUsers(hasNextPage ? result.slice(0, PAGE_SIZE) : result);
      setHasMore(hasNextPage);
      setPage(pageNum);
      setLoading(false);
    });
  };

  const handleSearch = () => {
    loadUsers(0);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("ro-RO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Caută după email sau nume..."
          className="flex-1 px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={handleSearch}
          disabled={isPending}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          Caută
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-white/40 text-sm">Se încarcă...</div>
      ) : users.length === 0 ? (
        <div className="text-center py-8 text-white/40 text-sm">
          {searchQuery ? "Niciun abonat găsit." : "Niciun abonat încă."}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/5 border border-white/5"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm text-white font-medium truncate">
                    {user.firstName || user.lastName
                      ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
                      : "—"}
                  </span>
                  <span className="text-xs text-white/50 truncate">{user.email}</span>
                </div>
                <span className="text-xs text-white/30 shrink-0 ml-2">
                  {user.marketingConsentAt ? formatDate(user.marketingConsentAt) : "—"}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => loadUsers(page - 1)}
              disabled={page === 0 || isPending}
              className="px-3 py-1.5 rounded text-xs font-medium bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← Înapoi
            </button>
            <span className="text-xs text-white/40">Pagina {page + 1}</span>
            <button
              onClick={() => loadUsers(page + 1)}
              disabled={!hasMore || isPending}
              className="px-3 py-1.5 rounded text-xs font-medium bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Înainte →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
