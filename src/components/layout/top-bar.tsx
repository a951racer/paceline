"use client";

import React from "react";
import { Bell } from "lucide-react";
import { LeagueSelector } from "@/components/league-selector";

/**
 * TopBar - Authenticated top navigation bar.
 *
 * Replaces static league name text with the interactive LeagueSelector component.
 * Branding from active league's configuration is applied via ThemeProvider/CSS custom properties.
 *
 * Requirements: 6.1, 11.3
 */
export function TopBar() {
  return (
    <header className="flex h-12 items-center justify-between border-b border-[#2E3038] bg-[#111214] px-4 sm:px-6">
      {/* League selector dropdown */}
      <LeagueSelector />

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button
          type="button"
          className="relative rounded-md p-2 text-[#C5CBD3] transition-colors hover:bg-[#1E1F24] hover:text-white"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-primary,#B87333)] text-[9px] font-bold text-white">
            1
          </span>
        </button>
      </div>
    </header>
  );
}
