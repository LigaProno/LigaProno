"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type AppModalProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  "aria-labelledby"?: string;
};

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isDesktop;
}

function getPanelMotion(isDesktop: boolean, reduceMotion: boolean) {
  if (reduceMotion) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.15 },
    };
  }

  if (isDesktop) {
    return {
      initial: { opacity: 0, scale: 0.94, y: 18 },
      animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { type: "spring" as const, damping: 28, stiffness: 320, mass: 0.85 },
      },
      exit: {
        opacity: 0,
        scale: 0.97,
        y: 10,
        transition: { duration: 0.18, ease: [0.4, 0, 0.2, 1] as const },
      },
    };
  }

  return {
    initial: { opacity: 0, y: "100%" },
    animate: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, damping: 34, stiffness: 360, mass: 0.9 },
    },
    exit: {
      opacity: 0,
      y: "100%",
      transition: { duration: 0.24, ease: [0.4, 0, 1, 1] as const },
    },
  };
}

export function AppModal({
  open,
  onClose,
  children,
  className = "w-full sm:max-w-lg max-h-[min(88dvh,720px)]",
  "aria-labelledby": ariaLabelledby,
}: AppModalProps) {
  const [mounted, setMounted] = useState(open);
  const isDesktop = useIsDesktop();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    const scrollRoot = document.querySelector("main");
    const prevMainOverflow = scrollRoot instanceof HTMLElement ? scrollRoot.style.overflow : "";
    const prevBodyOverflow = document.body.style.overflow;

    if (scrollRoot instanceof HTMLElement) scrollRoot.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      if (scrollRoot instanceof HTMLElement) scrollRoot.style.overflow = prevMainOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, [mounted, onClose]);

  if (!mounted || typeof document === "undefined") return null;

  const panelMotion = getPanelMotion(isDesktop, reduceMotion ?? false);

  return createPortal(
    <AnimatePresence onExitComplete={() => setMounted(false)}>
      {open ?
        <motion.div
          key="app-modal-root"
          className="ph-modal-root fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-6"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.1 : 0.2 }}
        >
          <motion.div
            className="absolute inset-0 ph-modal-backdrop-inline"
            onClick={onClose}
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.22 }}
          />
          <motion.div
            className={`ph-modal relative z-[1] flex flex-col rounded-t-2xl sm:rounded-2xl pointer-events-auto overflow-hidden ${className}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={ariaLabelledby}
            {...panelMotion}
          >
            {children}
          </motion.div>
        </motion.div>
      : null}
    </AnimatePresence>,
    document.body,
  );
}
