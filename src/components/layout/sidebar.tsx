"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  Globe,
  Database,
  LogOut,
} from "lucide-react";
import { useUserStore } from "@/hooks/use-user-store";

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
  { label: "Leagues", href: "/admin/leagues", icon: Globe, superAdminOnly: true },
  { label: "People", href: "/admin/people", icon: Users, superAdminOnly: false },
  { label: "Organizations", href: "/admin/organizations", icon: Building2, superAdminOnly: false },
  { label: "Enrollments", href: "/admin/enrollments", icon: UserCheck, superAdminOnly: false },
  { label: "Races", href: "/admin/races", icon: Flag, superAdminOnly: false },
  { label: "Results", href: "/admin/results", icon: ListOrdered, superAdminOnly: false },
  { label: "Seasons", href: "/admin/seasons", icon: Calendar, superAdminOnly: false },
  { label: "Competitions", href: "/admin/competitions", icon: Trophy, superAdminOnly: false },
  { label: "Achievements", href: "/admin/achievements", icon: Award, superAdminOnly: false },
  { label: "Awards", href: "/admin/awards", icon: Medal, superAdminOnly: false },
  { label: "Branding", href: "/admin/branding", icon: Palette, superAdminOnly: false },
  { label: "Reference Data", href: "/admin/reference-data", icon: Database, superAdminOnly: false },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const { name: userName, isAdmin, isSuperAdmin, clearUser } = useUserStore();

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userName");
    clearUser();
    router.replace("/");
  };

  return (
    <aside className="flex h-full w-56 flex-col bg-[#1A1B1F]">
      {/* Logo */}
      <div className="flex items-center justify-center px-3 py-4">
        <img
          src="/images/logo-sidebar.png"
          alt="Paceline logo"
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
        {isAdmin && (
          <div className="mt-4 border-t border-[#2E3038] pt-3">
            <div className="flex items-center gap-2 px-3 py-1.5">
              <Settings className="h-3 w-3 text-[#6B7280]" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
                Admin
              </span>
            </div>
            <ul className="space-y-0.5">
              {adminNavLinks
                .filter((link) => !link.superAdminOnly || isSuperAdmin)
                .map((link) => {
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
              {(userName || "User")
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">
              {(userName || "User").toUpperCase()}
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

      {/* Logout */}
      <div className="border-t border-[#2E3038] px-3 py-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium tracking-wider text-[#C5CBD3] transition-colors hover:bg-[#111214] hover:text-white"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>LOGOUT</span>
        </button>
      </div>
    </aside>
  );
}
