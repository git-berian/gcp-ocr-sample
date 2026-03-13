export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export async function post<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
  const rawBaseUrl = import.meta.env.VITE_API_URL;
  const baseUrl = rawBaseUrl ? rawBaseUrl.replace(/\/+$/, "") : "/api";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(`${baseUrl}${normalizedPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let message: string;
    try {
      const errorBody = await response.json();
      message = errorBody.error ?? `HTTP ${response.status}`;
    } catch {
      message = `HTTP ${response.status}`;
    }
    throw new ApiRequestError(message, response.status);
  }

  return response.json() as Promise<TRes>;
}
