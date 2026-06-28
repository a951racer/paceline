"use client";

import React from "react";
import { Bell, ChevronDown, Globe } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

export function TopBar() {
  const { branding } = useTheme();

  const leagueName = branding?.leagueName ?? "Kansas City Racing League";

  return (
    <header className="flex h-12 items-center justify-between border-b border-[#2E3038] bg-[#111214] px-4 sm:px-6">
      {/* League name selector */}
      <button className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1E1F24] transition-colors">
        <Globe className="h-4 w-4 text-[#9CA3AF]" />
        <span className="uppercase tracking-wide">{leagueName}</span>
        <ChevronDown className="h-3.5 w-3.5 text-[#6B7280]" />
      </button>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button
          type="button"
          className="relative rounded-md p-2 text-[#C5CBD3] transition-colors hover:bg-[#1E1F24] hover:text-white"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#B87333] text-[9px] font-bold text-white">
            1
          </span>
        </button>
      </div>
    </header>
  );
}
