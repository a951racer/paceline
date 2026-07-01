"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UserState {
  userId: string | null;
  email: string | null;
  name: string | null;
  roles: string[];
  adminScope: { type: string; leagueIds?: string[] } | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  setUser: (payload: {
    userId: string;
    email: string;
    name: string;
    roles: string[];
    adminScope?: { type: string; leagueIds?: string[] };
  }) => void;
  clearUser: () => void;
}

const ADMIN_ROLES = ["administrator", "super_administrator", "league_administrator"];

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      userId: null,
      email: null,
      name: null,
      roles: [],
      adminScope: null,
      isAdmin: false,
      isSuperAdmin: false,

      setUser: (payload) => {
        set({
          userId: payload.userId,
          email: payload.email,
          name: payload.name,
          roles: payload.roles,
          adminScope: payload.adminScope ?? null,
          isAdmin: payload.roles.some((r) => ADMIN_ROLES.includes(r)),
          isSuperAdmin: payload.roles.includes("super_administrator"),
        });
      },

      clearUser: () => {
        set({
          userId: null,
          email: null,
          name: null,
          roles: [],
          adminScope: null,
          isAdmin: false,
          isSuperAdmin: false,
        });
      },
    }),
    {
      name: "user-context",
    }
  )
);
