import { ComponentType } from "react";

export type Role =
  | "racer"
  | "volunteer"
  | "mentor"
  | "race_official"
  | "administrator";

export interface DashboardVariant {
  role: Role | null; // null = fallback (General Dashboard)
  component: ComponentType;
  priority: number; // higher number = higher priority
}

// Lazy imports to avoid circular dependencies and enable code splitting
import { RacerDashboard } from "./racer-dashboard";
import { AdminDashboard } from "./admin-dashboard";
import { GeneralDashboard } from "./general-dashboard";

export const dashboardRegistry: DashboardVariant[] = [
  { role: "racer", component: RacerDashboard, priority: 100 },
  { role: "administrator", component: AdminDashboard, priority: 50 },
  // Future: { role: 'mentor', component: MentorDashboard, priority: 75 },
  // Future: { role: 'volunteer', component: VolunteerDashboard, priority: 60 },
  { role: null, component: GeneralDashboard, priority: 0 }, // fallback
];

/**
 * Resolves which dashboard component to render based on user roles.
 * Evaluates the registry in priority order (highest first) and returns
 * the first matching component. Falls back to GeneralDashboard.
 */
export function resolveDashboard(userRoles: Role[]): ComponentType {
  const sorted = [...dashboardRegistry].sort(
    (a, b) => b.priority - a.priority
  );
  const match = sorted.find(
    (v) => v.role === null || userRoles.includes(v.role)
  );
  return match?.component ?? GeneralDashboard;
}
