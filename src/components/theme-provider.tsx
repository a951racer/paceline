"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

/** Branding data returned from /api/branding */
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
 *
 * Requirements 19.3: Apply 3 main colors to primary UI elements
 * Requirements 19.4: Apply 1-2 accent colors to secondary UI elements
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
 *
 * Requirement 11.7: Support light and dark mode toggle
 */
function applyThemeMode(mode: ThemeMode): void {
  document.documentElement.setAttribute("data-theme", mode);
}

/**
 * ThemeProvider - Provides branding context and light/dark mode support.
 *
 * Fetches branding from /api/branding on mount (client-side) and applies
 * mainColors and accentColors as CSS custom properties on the document root.
 *
 * Requirements: 19.3, 19.4, 11.7
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setModeState] = useState<ThemeMode>("light");

  // Initialize theme mode from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      setModeState(stored);
      applyThemeMode(stored);
    } else {
      // Default to system preference
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      const initialMode: ThemeMode = prefersDark ? "dark" : "light";
      setModeState(initialMode);
      applyThemeMode(initialMode);
    }
  }, []);

  // Fetch branding on mount
  useEffect(() => {
    async function fetchBranding() {
      try {
        const response = await fetch("/api/branding");
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
  }, []);

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
