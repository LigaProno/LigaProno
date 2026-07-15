"use client";

import { RedirectToTasks } from "@clerk/nextjs";

/** Redirecționează sesiunile pending (ex. reset parolă obligatoriu) către taskUrls. */
export function AuthTasksRedirect() {
  return <RedirectToTasks />;
}
