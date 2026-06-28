/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, useTheme } from "./theme-provider";

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Helper component to test useTheme hook
function ThemeConsumer() {
  const { branding, isLoading, error, mode, toggleMode, setMode } = useTheme();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="error">{error || "none"}</span>
      <span data-testid="mode">{mode}</span>
      <span data-testid="league-name">{branding?.leagueName || "none"}</span>
      <button data-testid="toggle" onClick={toggleMode}>
        Toggle
      </button>
      <button data-testid="set-dark" onClick={() => setMode("dark")}>
        Dark
      </button>
      <button data-testid="set-light" onClick={() => setMode("light")}>
        Light
      </button>
    </div>
  );
}

const mockBrandingData = {
  leagueName: "Test Racing League",
  logos: {
    square: "https://cdn.example.com/square.png",
    horizontal: "https://cdn.example.com/horizontal.png",
    vertical: "https://cdn.example.com/vertical.png",
  },
  mainColors: ["#FF0000", "#00FF00", "#0000FF"] as [string, string, string],
  accentColors: ["#FFAA00", "#AA00FF"],
};

describe("ThemeProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    // Remove any applied styles/attributes from previous tests
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.removeProperty("--color-primary");
    document.documentElement.style.removeProperty("--color-secondary");
    document.documentElement.style.removeProperty("--color-tertiary");
    document.documentElement.style.removeProperty("--color-accent-1");
    document.documentElement.style.removeProperty("--color-accent-2");

    // Default mock: successful branding fetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockBrandingData }),
    });

    // Mock matchMedia for system theme preference
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: false, // default to light mode
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  it("fetches branding on mount and provides it via context", async () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    // Initially loading
    expect(screen.getByTestId("loading").textContent).toBe("true");

    // Wait for branding to load
    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    expect(screen.getByTestId("league-name").textContent).toBe(
      "Test Racing League"
    );
    expect(screen.getByTestId("error").textContent).toBe("none");
  });

  it("applies CSS custom properties from branding colors", async () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    const root = document.documentElement;
    expect(root.style.getPropertyValue("--color-primary")).toBe("#FF0000");
    expect(root.style.getPropertyValue("--color-secondary")).toBe("#00FF00");
    expect(root.style.getPropertyValue("--color-tertiary")).toBe("#0000FF");
    expect(root.style.getPropertyValue("--color-accent-1")).toBe("#FFAA00");
    expect(root.style.getPropertyValue("--color-accent-2")).toBe("#AA00FF");
  });

  it("handles branding with only 1 accent color", async () => {
    const singleAccent = {
      ...mockBrandingData,
      accentColors: ["#FFAA00"],
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: singleAccent }),
    });

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    const root = document.documentElement;
    expect(root.style.getPropertyValue("--color-accent-1")).toBe("#FFAA00");
    expect(root.style.getPropertyValue("--color-accent-2")).toBe("");
  });

  it("handles fetch errors gracefully", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    expect(screen.getByTestId("error").textContent).toContain("500");
    expect(screen.getByTestId("league-name").textContent).toBe("none");
  });

  it("defaults to light mode when no preference is stored", async () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    expect(screen.getByTestId("mode").textContent).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("restores theme preference from localStorage", async () => {
    localStorage.setItem("bike-racing-league-theme", "dark");

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("mode").textContent).toBe("dark");
    });

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("toggles between light and dark mode", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    expect(screen.getByTestId("mode").textContent).toBe("light");

    await user.click(screen.getByTestId("toggle"));

    expect(screen.getByTestId("mode").textContent).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("bike-racing-league-theme")).toBe("dark");

    await user.click(screen.getByTestId("toggle"));

    expect(screen.getByTestId("mode").textContent).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem("bike-racing-league-theme")).toBe("light");
  });

  it("setMode directly sets the theme mode", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });

    await user.click(screen.getByTestId("set-dark"));

    expect(screen.getByTestId("mode").textContent).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("bike-racing-league-theme")).toBe("dark");
  });

  it("respects system dark mode preference when no stored preference exists", async () => {
    // Mock system preference to dark
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-color-scheme: dark)",
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("mode").textContent).toBe("dark");
    });

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});
