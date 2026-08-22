const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

type ApiErrorBody = {
  detail?: string;
};

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  const body = (await response.json().catch(() => ({}))) as ApiErrorBody;

  if (!response.ok) {
    throw new Error(body.detail ?? "Something went wrong. Please try again.");
  }

  return body as T;
}
