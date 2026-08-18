import "server-only";

import { prisma } from "@/lib/prisma";

type SnapshotRow = {
  payload: unknown;
  fetchedAt: Date;
};

type SnapshotDelegate = {
  findUnique: (args: {
    where: { cacheKey: string };
  }) => Promise<{ payload: unknown; fetchedAt: Date } | null>;
  upsert: (args: {
    where: { cacheKey: string };
    create: { cacheKey: string; payload: unknown; fetchedAt: Date };
    update: { payload: unknown; fetchedAt: Date };
  }) => Promise<unknown>;
};

const memory = new Map<string, SnapshotRow>();

function db(): SnapshotDelegate | null {
  const client = prisma as unknown as { footballDataSnapshot?: SnapshotDelegate };
  return client.footballDataSnapshot ?? null;
}

export function readFdSnapshotSync<T>(cacheKey: string): (SnapshotRow & { payload: T }) | null {
  const mem = memory.get(cacheKey);
  return mem ? { payload: mem.payload as T, fetchedAt: mem.fetchedAt } : null;
}

/** Memorie întâi (instant). Mongo doar dacă memoria e goală — nu blochează cache hit. */
export async function readFdSnapshot<T>(cacheKey: string): Promise<SnapshotRow & { payload: T } | null> {
  const mem = readFdSnapshotSync<T>(cacheKey);
  if (mem) return mem;

  try {
    const table = db();
    if (!table) return null;
    const row = await table.findUnique({ where: { cacheKey } });
    if (!row) return null;
    memory.set(cacheKey, { payload: row.payload, fetchedAt: row.fetchedAt });
    return { payload: row.payload as T, fetchedAt: row.fetchedAt };
  } catch {
    return null;
  }
}

export async function writeFdSnapshot(cacheKey: string, payload: unknown): Promise<void> {
  const fetchedAt = new Date();
  memory.set(cacheKey, { payload, fetchedAt });
  const table = db();
  if (!table) return;
  void table
    .upsert({
      where: { cacheKey },
      create: { cacheKey, payload, fetchedAt },
      update: { payload, fetchedAt },
    })
    .catch(() => undefined);
}

export function snapshotAgeMs(fetchedAt: Date, now = Date.now()): number {
  return now - fetchedAt.getTime();
}

export function isSnapshotFresh(fetchedAt: Date, ttlMs: number, now = Date.now()): boolean {
  return snapshotAgeMs(fetchedAt, now) < ttlMs;
}
