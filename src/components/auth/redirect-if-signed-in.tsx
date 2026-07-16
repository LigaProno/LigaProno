"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";

/**
 * Dacă există deja o sesiune Clerk activă pe /sign-in sau /sign-up,
 * trimite userul în app — evită eroarea Clerk "You're already signed in".
 */
export function RedirectIfSignedIn({ to = "/dashboard" }: { to?: string }) {
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    window.location.replace(to);
  }, [isLoaded, isSignedIn, to]);

  return null;
}
