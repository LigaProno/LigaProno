"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { setPrizePreference } from "@/app/actions/tournament";
import { useLocale } from "@/components/i18n/locale-provider";

/** Un rând ordonabil: drag (mouse/touch) + ↑/↓ ca alternativă accesibilă. */
function SortableRow({
  prize,
  index,
  total,
  editable,
  onMove,
  moveUpLabel,
  moveDownLabel,
}: {
  prize: string;
  index: number;
  total: number;
  editable: boolean;
  onMove: (index: number, dir: -1 | 1) => void;
  moveUpLabel: string;
  moveDownLabel: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: prize,
    disabled: !editable,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        borderColor: "rgba(197,160,89,0.25)",
        backgroundColor: isDragging ? "rgba(197,160,89,0.16)" : "rgba(197,160,89,0.06)",
        opacity: isDragging ? 0.9 : 1,
        boxShadow: isDragging ? "0 8px 24px rgba(0,0,0,0.45)" : undefined,
        zIndex: isDragging ? 10 : undefined,
        touchAction: editable ? "none" : undefined,
      }}
      className="relative flex items-center gap-3 rounded-xl border px-3 py-2.5"
    >
      <span
        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0"
        style={{ backgroundColor: "rgba(197,160,89,0.2)", color: "#C5A059" }}
      >
        {index + 1}
      </span>

      {editable ? (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Trage pentru a reordona"
          className="shrink-0 cursor-grab active:cursor-grabbing touch-none px-0.5"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          {/* grip */}
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
            <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
            <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
          </svg>
        </button>
      ) : null}

      <span className="text-sm font-medium text-white flex-1 min-w-0 truncate">{prize}</span>

      {editable ? (
        <span className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onMove(index, -1)}
            disabled={index === 0}
            aria-label={moveUpLabel}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/[0.08] disabled:opacity-25"
            style={{ color: "rgba(255,255,255,0.75)" }}
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove(index, 1)}
            disabled={index === total - 1}
            aria-label={moveDownLabel}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/[0.08] disabled:opacity-25"
            style={{ color: "rgba(255,255,255,0.75)" }}
          >
            ↓
          </button>
        </span>
      ) : null}
    </div>
  );
}

/**
 * Ordonează premiile după preferință prin drag-and-drop (mouse + touch) sau ↑/↓.
 * `editable=false` = doar citire (turneu închis).
 */
export function PrizePreferencePanel({
  tournamentId,
  pool,
  initial,
  editable = true,
  onSaved,
  compact = false,
}: {
  tournamentId: string;
  pool: string[];
  initial: string[];
  editable?: boolean;
  onSaved?: () => void;
  compact?: boolean;
}) {
  const { t } = useLocale();
  const router = useRouter();

  const validInitial =
    initial.length === pool.length && initial.every((p) => pool.includes(p));
  const [order, setOrder] = useState<string[]>(validInitial ? initial : pool);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= order.length) return;
    setSaved(false);
    setOrder((prev) => arrayMove(prev, index, j));
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setSaved(false);
    setOrder((prev) => {
      const from = prev.indexOf(String(active.id));
      const to = prev.indexOf(String(over.id));
      if (from < 0 || to < 0) return prev;
      return arrayMove(prev, from, to);
    });
  };

  const save = () => {
    setError(null);
    startTransition(async () => {
      try {
        await setPrizePreference(tournamentId, order);
        setSaved(true);
        router.refresh();
        onSaved?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Eroare.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-2.5">
      {!compact ? (
        <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
          {t("party.prizePref.hint")}
        </p>
      ) : null}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-1.5">
            {order.map((prize, i) => (
              <SortableRow
                key={prize}
                prize={prize}
                index={i}
                total={order.length}
                editable={editable}
                onMove={move}
                moveUpLabel={t("party.prizePref.moveUp")}
                moveDownLabel={t("party.prizePref.moveDown")}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {error ? <p className="text-xs text-red-400">{error}</p> : null}

      {editable ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="px-4 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#C5A059", color: "#0A0B1E" }}
          >
            {isPending ? t("party.prizePref.saving") : t("party.prizePref.save")}
          </button>
          {saved ? (
            <span className="text-xs" style={{ color: "#34D399" }}>
              {t("party.prizePref.saved")}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
