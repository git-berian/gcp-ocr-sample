import { vi } from "vitest";

/**
 * `parseDocument` が使う `fetch` のモック。
 * dev サーバーの proxy が Authorization を付ける構成のため、テストでは
 * ヘッダーではなく「どのエンドポイントに何を送ったか」を検証する。
 */
export const mockFetch = vi.fn();

vi.stubGlobal("fetch", mockFetch);

/**
 * 成功レスポンス（HTTP 200 + JSON ボディ）を作る。
 *
 * `Response` の本文は 1 回しか読めない。fetch が複数回呼ばれるテストでは
 * `mockResolvedValue(okResponse(x))` を使うと 2 回目が `Body is already read` で落ちるため、
 * `mockResolvedValueOnce` を並べるか `mockImplementation(() => okResponse(x))` を使うこと。
 */
export function okResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/** 失敗レスポンス（`{ error }` ボディ）を作る。 */
export function errorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
