import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseDocument } from "./parse-document";

const REQUEST = { content: "base64data", mimeType: "image/png" };

const RESPONSE = {
  receipt: {
    supplierName: "テスト商店",
    receiptDate: "2026-05-16",
    totalAmount: 4800,
    taxAmount: 436,
    registrationNumber: "T1234567890123",
    transcription: "書き起こし",
    meta: { source: "gemini" },
  },
};

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function okResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/** 直近の fetch 呼び出しの URL と、JSON としてパースしたボディを返す。 */
function lastCall(): { url: string; body: unknown; init: RequestInit } {
  const [url, init] = mockFetch.mock.calls.at(-1) as [string, RequestInit];
  return { url, init, body: JSON.parse(init.body as string) };
}

describe("parseDocument", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("エンジン未指定なら Document AI のエンドポイントを叩く", async () => {
    mockFetch.mockResolvedValue(okResponse(RESPONSE));

    const result = await parseDocument(REQUEST);

    expect(lastCall().url).toBe("/api/parseDocumentHttp");
    expect(result).toEqual(RESPONSE);
  });

  it.each([
    ["document-ai", "/api/parseDocumentHttp"],
    ["gemini", "/api/parseDocumentGeminiHttp"],
    ["claude", "/api/parseDocumentClaudeHttp"],
  ] as const)("engine=%s のとき %s を叩く", async (engine, url) => {
    mockFetch.mockResolvedValue(okResponse(RESPONSE));

    const result = await parseDocument(REQUEST, engine);

    expect(lastCall().url).toBe(url);
    expect(result).toEqual(RESPONSE);
  });

  it("POST で JSON ボディを送る", async () => {
    mockFetch.mockResolvedValue(okResponse(RESPONSE));

    await parseDocument(REQUEST, "gemini");

    const { init, body } = lastCall();
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(body).toEqual(REQUEST);
  });

  it("Authorization ヘッダーは送らない（dev サーバーの proxy が付与するため）", async () => {
    mockFetch.mockResolvedValue(okResponse(RESPONSE));

    await parseDocument(REQUEST, "gemini");

    expect(lastCall().init.headers).not.toHaveProperty("Authorization");
  });

  it("エラーレスポンスの error をメッセージにして投げる", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: "無効な API キーです。" }), { status: 401 }),
    );

    await expect(parseDocument(REQUEST, "gemini")).rejects.toThrow("無効な API キーです。");
  });

  it("fetch 自体が失敗したら例外がそのまま伝わる（エミュレータ停止・ネットワーク断）", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(parseDocument(REQUEST, "gemini")).rejects.toThrow("Failed to fetch");
  });

  it("200 でも JSON でなければ解析失敗として投げる", async () => {
    mockFetch.mockResolvedValue(new Response("<html>proxy error</html>", { status: 200 }));

    await expect(parseDocument(REQUEST, "gemini")).rejects.toThrow(
      "レスポンスの解析に失敗しました",
    );
  });

  it("JSON でない失敗レスポンスはステータスからメッセージを組み立てる", async () => {
    mockFetch.mockResolvedValue(new Response("Bad Gateway", { status: 502 }));

    await expect(parseDocument(REQUEST, "gemini")).rejects.toThrow(
      "リクエストに失敗しました（HTTP 502）",
    );
  });
});
