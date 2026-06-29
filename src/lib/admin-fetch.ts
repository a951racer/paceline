import { useLeagueStore } from "@/hooks/use-league-store";

/**
 * Authenticated fetch utility for admin API calls.
 *
 * Automatically attaches:
 * - `Authorization: Bearer <token>` header from localStorage("accessToken")
 * - `leagueId` query parameter from the active league in useLeagueStore (when present)
 *
 * Caller-provided headers, body, and method are preserved unchanged.
 * If no token is found in localStorage, the request proceeds without
 * the Authorization header (middleware will return 401 and the
 * authenticated layout handles the redirect).
 */
export async function adminFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  // Read token from localStorage
  const token = localStorage.getItem("accessToken");

  // Build merged headers
  const headers = new Headers(options?.headers as HeadersInit | undefined);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Append leagueId query parameter when active league exists and URL doesn't already have one
  let finalUrl = url;
  try {
    const { activeLeagueId } = useLeagueStore.getState();
    if (activeLeagueId && !finalUrl.includes("leagueId=")) {
      const separator = finalUrl.includes("?") ? "&" : "?";
      finalUrl = `${finalUrl}${separator}leagueId=${encodeURIComponent(activeLeagueId)}`;
    }
  } catch {
    // If league store is unavailable, proceed without leagueId
  }

  // Call fetch with merged options
  return fetch(finalUrl, {
    ...options,
    headers,
  });
}
