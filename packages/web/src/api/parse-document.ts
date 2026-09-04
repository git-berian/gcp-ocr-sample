import { DEFAULT_ENGINE, ENGINES, type Engine } from "./engines";
import type { ParseDocumentRequest, ParseDocumentResponse } from "./types";

// dev サーバーの proxy が Authorization ヘッダーを付けてエミュレータへ転送する
// （`vite.config.ts`）。ブラウザは API キーを持たない。
const API_PREFIX = "/api";

/** エラーレスポンスの本文。Functions は失敗時に `{ error }` を返す。 */
interface ErrorBody {
  error?: unknown;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ErrorBody;
    if (typeof body.error === "string" && body.error !== "") {
      return body.error;
    }
  } catch {
    // JSON でない（プロキシのエラー等）場合はステータスから組み立てる。
  }
  return `リクエストに失敗しました（HTTP ${response.status}）`;
}

export async function parseDocument(
  request: ParseDocumentRequest,
  engine: Engine = DEFAULT_ENGINE,
): Promise<ParseDocumentResponse> {
  const response = await fetch(`${API_PREFIX}/${ENGINES[engine].endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  try {
    return (await response.json()) as ParseDocumentResponse;
  } catch {
    // 200 でも JSON でないことがある（proxy の異常など）。生の SyntaxError を UI に出さない。
    throw new Error("レスポンスの解析に失敗しました");
  }
}
