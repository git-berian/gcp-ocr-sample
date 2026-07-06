import { httpsCallable, type HttpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import { DEFAULT_ENGINE, ENGINES, type Engine } from "./engines";
import type { ParseDocumentRequest, ParseDocumentResponse } from "./types";

// エンジンごとに callable を生成・キャッシュする（初回呼び出し時に生成）。
const callableCache = new Map<Engine, HttpsCallable<ParseDocumentRequest, ParseDocumentResponse>>();

function getCallable(engine: Engine): HttpsCallable<ParseDocumentRequest, ParseDocumentResponse> {
  const cached = callableCache.get(engine);
  if (cached) return cached;

  const callable = httpsCallable<ParseDocumentRequest, ParseDocumentResponse>(
    functions,
    ENGINES[engine].callableName,
  );
  callableCache.set(engine, callable);
  return callable;
}

export async function parseDocument(
  request: ParseDocumentRequest,
  engine: Engine = DEFAULT_ENGINE,
): Promise<ParseDocumentResponse> {
  const result = await getCallable(engine)(request);
  return result.data;
}
