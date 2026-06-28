"use client";

import React from "react";
import { resolveDashboard, Role } from "@/components/dashboard/dashboard-registry";

// Mock user roles — in production this would come from auth context/token
// This mirrors the mockUser in sidebar.tsx
const mockUserRoles: Role[] = ["racer", "administrator"];

// Resolve dashboard outside of render to avoid the react-hooks/static-components warning
const DashboardComponent = resolveDashboard(mockUserRoles);

export default function DashboardPage() {
  return <DashboardComponent />;
}
