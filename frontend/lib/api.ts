export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/backend/${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Your session expired. Sign in again to continue.");
    }
    const result = await response.json().catch(() => ({}));
    const detail = result.detail;
    throw new Error(
      response.status === 409
        ? "This ticket changed. Refreshed the board; review the latest version."
        : typeof detail === "string"
          ? detail
          : `Request failed (${response.status}). Please retry.`,
    );
  }
  return response.json();
}
