"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useLeagueStore } from "@/hooks/use-league-store";

/** Branding data returned from /api/branding or /api/leagues/[leagueId]/branding */
export interface BrandingData {
  leagueName: string;
  logos: {
    square: string;
    horizontal: string;
    vertical: string;
  };
  mainColors: [string, string, string];
  accentColors: string[];
}

export type ThemeMode = "light" | "dark";

interface ThemeContextValue {
  branding: BrandingData | null;
  isLoading: boolean;
  error: string | null;
  mode: ThemeMode;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
}

const THEME_STORAGE_KEY = "bike-racing-league-theme";

const defaultContext: ThemeContextValue = {
  branding: null,
  isLoading: true,
  error: null,
  mode: "light",
  toggleMode: () => {},
  setMode: () => {},
};

const ThemeContext = createContext<ThemeContextValue>(defaultContext);

/**
 * Apply branding colors as CSS custom properties on the document root element.
 * CSS custom properties update on league switch.
 *
 * Requirements 11.3, 11.4: Apply branding from active league configuration
 */
function applyBrandingColors(branding: BrandingData): void {
  const root = document.documentElement;

  // Main colors
  root.style.setProperty("--color-primary", branding.mainColors[0]);
  root.style.setProperty("--color-secondary", branding.mainColors[1]);
  root.style.setProperty("--color-tertiary", branding.mainColors[2]);

  // Accent colors
  root.style.setProperty("--color-accent-1", branding.accentColors[0]);
  if (branding.accentColors[1]) {
    root.style.setProperty("--color-accent-2", branding.accentColors[1]);
  } else {
    root.style.removeProperty("--color-accent-2");
  }
}

/**
 * Apply theme mode as a data attribute on the html element.
 */
function applyThemeMode(mode: ThemeMode): void {
  document.documentElement.setAttribute("data-theme", mode);
}

/**
 * ThemeProvider - Provides branding context and light/dark mode support.
 *
 * Sources branding from active league's embedded configuration.
 * When the league context changes (activeLeagueId updates in Zustand store),
 * re-fetches branding from the league-specific endpoint and updates CSS custom properties.
 *
 * Requirements: 11.3, 11.4
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setModeState] = useState<ThemeMode>("light");

  const activeLeagueId = useLeagueStore((state) => state.activeLeagueId);

  // Initialize theme mode from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      setModeState(stored);
      applyThemeMode(stored);
    } else {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      const initialMode: ThemeMode = prefersDark ? "dark" : "light";
      setModeState(initialMode);
      applyThemeMode(initialMode);
    }
  }, []);

  // Fetch branding when activeLeagueId changes (or on mount)
  useEffect(() => {
    async function fetchBranding() {
      try {
        setIsLoading(true);
        setError(null);

        // If there's an active league, fetch league-specific branding
        // Otherwise fall back to the default /api/branding endpoint
        const url = activeLeagueId
          ? `/api/leagues/${activeLeagueId}/branding`
          : "/api/branding";

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch branding: ${response.status}`);
        }
        const json = await response.json();
        const data: BrandingData = json.data;
        setBranding(data);
        applyBrandingColors(data);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load branding";
        setError(message);
        console.error("[ThemeProvider] Branding fetch error:", message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchBranding();
  }, [activeLeagueId]);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    applyThemeMode(newMode);
    localStorage.setItem(THEME_STORAGE_KEY, newMode);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => {
      const next: ThemeMode = prev === "light" ? "dark" : "light";
      applyThemeMode(next);
      localStorage.setItem(THEME_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const value: ThemeContextValue = {
    branding,
    isLoading,
    error,
    mode,
    toggleMode,
    setMode,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/**
 * Hook to access the theme context (branding data and mode controls).
 *
 * @throws Error if used outside of ThemeProvider
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
