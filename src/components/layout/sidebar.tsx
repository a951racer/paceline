"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Flag,
  BarChart3,
  Users,
  GraduationCap,
  Award,
  UserCheck,
  MessageSquare,
  User,
  Settings,
  Building2,
  Trophy,
  Medal,
  Palette,
  ListOrdered,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

const mainNavLinks = [
  { label: "DASHBOARD", href: "/dashboard", icon: LayoutDashboard },
  { label: "CALENDAR", href: "/dashboard/calendar", icon: Calendar },
  { label: "RACES", href: "/dashboard/races", icon: Flag },
  { label: "STANDINGS", href: "/dashboard/standings", icon: BarChart3 },
  { label: "TEAMS", href: "/dashboard/teams", icon: Users },
  { label: "ACADEMY", href: "/dashboard/academy", icon: GraduationCap },
  { label: "ACHIEVEMENTS", href: "/dashboard/achievements", icon: Award },
  { label: "MENTORS", href: "/dashboard/mentors", icon: UserCheck },
  { label: "MESSAGES", href: "/dashboard/messages", icon: MessageSquare },
  { label: "PROFILE", href: "/dashboard/profile", icon: User },
];

const adminNavLinks = [
  { label: "People", href: "/admin/people", icon: Users },
  { label: "Organizations", href: "/admin/organizations", icon: Building2 },
  { label: "Races", href: "/admin/races", icon: Flag },
  { label: "Results", href: "/admin/results", icon: ListOrdered },
  { label: "Seasons", href: "/admin/seasons", icon: Calendar },
  { label: "Competitions", href: "/admin/competitions", icon: Trophy },
  { label: "Achievements", href: "/admin/achievements", icon: Award },
  { label: "Awards", href: "/admin/awards", icon: Medal },
  { label: "Branding", href: "/admin/branding", icon: Palette },
];

// Mock user for now
const mockUser = {
  name: "Jon Hobbs",
  role: "racer" as const,
  category: "Cat 4",
  team: "Team Velocity",
  isAdmin: true,
};

export function Sidebar() {
  const pathname = usePathname();
  const { branding, mode, toggleMode } = useTheme();

  const logoUrl = branding?.logos?.square;
  const leagueName = branding?.leagueName ?? "Paceline";

  return (
    <aside className="flex h-full w-56 flex-col bg-[#1A1B1F]">
      {/* Logo */}
      <div className="flex items-center justify-center px-3 py-4">
        <img
          src={logoUrl || "/images/logo-sidebar.png"}
          alt={`${leagueName} logo`}
          className="h-auto w-full max-w-[140px] object-contain"
        />
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        <ul className="space-y-0.5">
          {mainNavLinks.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/dashboard" && pathname.startsWith(link.href));
            const Icon = link.icon;

            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-xs font-medium tracking-wider transition-colors ${
                    isActive
                      ? "border-l-2 border-[#B87333] bg-[#B87333]/5 pl-[10px] text-[#B87333]"
                      : "text-[#C5CBD3] hover:bg-[#111214] hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Admin Section */}
        {mockUser.isAdmin && (
          <div className="mt-4 border-t border-[#2E3038] pt-3">
            <div className="flex items-center gap-2 px-3 py-1.5">
              <Settings className="h-3 w-3 text-[#6B7280]" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
                Admin
              </span>
            </div>
            <ul className="space-y-0.5">
              {adminNavLinks.map((link) => {
                const isActive = pathname.startsWith(link.href);
                const Icon = link.icon;

                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`flex items-center gap-3 rounded-md px-3 py-2 text-xs font-medium tracking-wider transition-colors ${
                        isActive
                          ? "border-l-2 border-[#B87333] bg-[#B87333]/5 pl-[10px] text-[#B87333]"
                          : "text-[#C5CBD3] hover:bg-[#111214] hover:text-white"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{link.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>

      {/* User Profile Card */}
      <div className="border-t border-[#2E3038] px-3 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2E3038]">
            <span className="text-xs font-semibold text-[#C5CBD3]">
              {mockUser.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">
              {mockUser.name.toUpperCase()}
            </p>
            <p className="text-[10px] text-[#6B7280] truncate">
              {mockUser.category} · {mockUser.team}
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/profile"
          className="mt-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[#B87333] hover:text-[#D4915A]"
        >
          VIEW PROFILE &gt;
        </Link>
      </div>

      {/* Light/Dark Toggle */}
      <div className="border-t border-[#2E3038] px-3 py-3">
        <div className="flex items-center gap-2">
          <Sun className="h-3.5 w-3.5 text-[#6B7280]" />
          <span className="text-[10px] text-[#6B7280] uppercase tracking-wider">Light</span>
          <button
            onClick={toggleMode}
            className="relative mx-1 h-5 w-9 rounded-full bg-[#2E3038] transition-colors"
            aria-label={`Switch to ${mode === "light" ? "dark" : "light"} mode`}
          >
            <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-[#B87333] transition-transform ${mode === "dark" ? "left-[18px]" : "left-0.5"}`} />
          </button>
          <Moon className="h-3.5 w-3.5 text-[#6B7280]" />
          <span className="text-[10px] text-[#6B7280] uppercase tracking-wider">Dark</span>
        </div>
      </div>
    </aside>
  );
}
