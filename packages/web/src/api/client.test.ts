import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { post, ApiRequestError } from "./client";

describe("post", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sends a POST request and returns JSON response", async () => {
    const mockResponse = { entities: [] };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      }),
    );

    const result = await post<{ name: string }, { entities: never[] }>("/parseDocument", {
      name: "test",
    });

    expect(fetch).toHaveBeenCalledWith("/api/parseDocument", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "test" }),
    });
    expect(result).toEqual(mockResponse);
  });

  it("uses VITE_API_URL as base URL when set", async () => {
    vi.stubEnv("VITE_API_URL", "https://example.com");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      }),
    );

    await post("/parseDocument", {});

    expect(fetch).toHaveBeenCalledWith(
      "https://example.com/parseDocument",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("throws ApiRequestError with error message on non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: "Invalid request" }),
      }),
    );

    await expect(post("/parseDocument", {})).rejects.toThrow(ApiRequestError);
    await expect(post("/parseDocument", {})).rejects.toThrow("Invalid request");
  });

  it("falls back to HTTP status when error field is missing from response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: () => Promise.resolve({ message: "other format" }),
      }),
    );

    await expect(post("/parseDocument", {})).rejects.toThrow("HTTP 422");
  });

  it("throws ApiRequestError with status code when error JSON parsing fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error("parse error")),
      }),
    );

    await expect(post("/parseDocument", {})).rejects.toThrow("HTTP 500");
  });
});
