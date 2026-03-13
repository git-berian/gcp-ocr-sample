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
  const baseUrl = import.meta.env.VITE_API_URL ?? "/api";
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let message: string;
    try {
      const errorBody = await response.json();
      message = errorBody.error;
    } catch {
      message = `HTTP ${response.status}`;
    }
    throw new ApiRequestError(message, response.status);
  }

  return response.json() as Promise<TRes>;
}
