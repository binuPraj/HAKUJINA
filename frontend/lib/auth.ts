/**
 * Compatibility wrapper for auth helpers
 * Re-exports and builds on lib/api.ts
 */

export {
  authApi,
  getStoredTokens,
  setStoredTokens,
  clearStoredTokens,
  parseApiError as getRequestError,
} from "./api";

import { API_BASE_URL, parseApiError } from "./api";

export async function postAuth<T>(
  endpoint: string,
  payload: Record<string, string>,
): Promise<T> {
  const cleanEndpoint = endpoint.replace(/^\/+|\/+$/g, "");
  const response = await fetch(`${API_BASE_URL}/auth/${cleanEndpoint}/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(parseApiError(body));
  }

  return body as T;
}
