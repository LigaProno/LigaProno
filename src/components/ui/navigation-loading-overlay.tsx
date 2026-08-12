"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { PageLoading } from "@/components/ui/page-loading";

function isModifiedClick(e: MouseEvent): boolean {
  return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
}

function shouldHandleAnchor(anchor: HTMLAnchorElement): boolean {
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return false;
  }
  try {
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return false;
    if (url.pathname === window.location.pathname && url.search === window.location.search) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Full-viewport loading over the main pane (sidebar stays).
 * Holds briefly after the route changes so loading.tsx ↔ content doesn't flash.
 */
export function NavigationLoadingOverlay() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const [opaque, setOpaque] = useState(false);
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const prevRouteKey = useRef(routeKey);
  const activeRef = useRef(false);
  const hideTimers = useRef<number[]>([]);

  activeRef.current = active;

  function clearHideTimers() {
    for (const id of hideTimers.current) window.clearTimeout(id);
    hideTimers.current = [];
  }

  function show() {
    clearHideTimers();
    setActive(true);
    requestAnimationFrame(() => setOpaque(true));
  }

  function hideSmooth() {
    clearHideTimers();
    setOpaque(false);
    const id = window.setTimeout(() => {
      setActive(false);
      activeRef.current = false;
    }, 180);
    hideTimers.current.push(id);
  }

  useEffect(() => {
    if (prevRouteKey.current === routeKey) return;
    prevRouteKey.current = routeKey;
    if (!activeRef.current) return;

    clearHideTimers();
    const hold = window.setTimeout(() => hideSmooth(), 140);
    hideTimers.current.push(hold);
  }, [routeKey]);

  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => hideSmooth(), 20_000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (isModifiedClick(e)) return;
      const target = e.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (!shouldHandleAnchor(anchor)) return;
      show();
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clearHideTimers();
    };
  }, []);

  if (!active) return null;

  return (
    <div
      className="nav-loading-overlay"
      style={{ opacity: opaque ? 1 : 0 }}
      aria-busy="true"
    >
      <PageLoading />
    </div>
  );
}
