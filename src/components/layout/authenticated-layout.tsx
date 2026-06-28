"use client";

import React from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#111214]">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* TopBar */}
        <TopBar />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-[#111214] p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
