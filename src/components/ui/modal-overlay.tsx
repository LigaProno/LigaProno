"use client";

import { useEffect, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Overlay de modal randat prin portal în <body>. Obligatoriu pentru modale
 * deschise din interiorul cardurilor: orice părinte cu `transform` (ex.
 * hover:-translate-y-0.5) devine containing block pentru `position: fixed`,
 * iar modalul ar apărea „în interiorul" cardului în loc de centrul ecranului.
 */
export function ModalOverlay({
  onDismiss,
  children,
  className = "fixed inset-0 z-[100] flex items-center justify-center p-4",
  style = { backgroundColor: "rgba(0,0,0,0.6)" },
}: {
  onDismiss?: () => void;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  useEffect(() => {
    // Blochează scroll-ul paginii cât timp modalul e deschis.
    const prevBody = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
    };
  }, []);

  // Modalele se deschid doar din interacțiuni client-side; guard pentru SSR.
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className={className} style={style} onClick={onDismiss}>
      {children}
    </div>,
    document.body,
  );
}
