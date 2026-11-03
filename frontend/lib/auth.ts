const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"
).replace(/\/+$/, "");

function getErrorMessage(body: unknown): string {
  if (typeof body !== "object" || body === null) {
    return "Something went wrong. Please try again.";
  }

  const values = Object.values(body);
  for (const value of values) {
    if (typeof value === "string") return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  }

  return "Something went wrong. Please try again.";
}

export async function postAuth<T>(
  endpoint: string,
  payload: Record<string, string>,
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}/auth/${endpoint}/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body: unknown = await response.json();

  if (!response.ok) {
    throw new Error(getErrorMessage(body));
  }

  return body as T;
}

export function getRequestError(error: unknown): string {
  if (error instanceof TypeError) {
    return "We couldn't reach the studio. Please check your connection and try again.";
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}
