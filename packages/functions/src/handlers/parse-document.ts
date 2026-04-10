import type { Request } from "firebase-functions/v2/https";
import { validateApiKey } from "../infrastructure/auth-validator.js";
import { validateParseDocumentRequest } from "../infrastructure/request-validator.js";
import { loadFunctionsConfig } from "../infrastructure/config.js";
import { createDocumentProcessor } from "../infrastructure/document-ai-client.js";
import { parseDocument } from "../application/parse-document.js";

interface JsonResponse {
  status(code: number): JsonResponse;
  json(body: unknown): JsonResponse;
}

export const handleParseDocument = async (req: Request, res: JsonResponse): Promise<void> => {
  console.log(`[${req.method}] ${req.path}`);

  if (req.method !== "POST") {
    const body = { error: "許可されていないメソッドです。POST を使用してください。" };
    console.log(`[RES] 405`, JSON.stringify(body));
    res.status(405).json(body);
    return;
  }

  const authResult = validateApiKey(req.headers.authorization, process.env.API_KEY ?? "");
  if (!authResult.ok) {
    const body = { error: authResult.message };
    console.log(`[RES] 401`, JSON.stringify(body));
    res.status(401).json(body);
    return;
  }

  const validation = validateParseDocumentRequest(req.body);
  if (!validation.ok) {
    const body = { error: validation.message };
    console.log(`[RES] 400`, JSON.stringify(body));
    res.status(400).json(body);
    return;
  }

  try {
    const config = loadFunctionsConfig();
    const processor = createDocumentProcessor(config.location);

    const entities = await parseDocument(
      {
        projectId: config.projectId,
        location: config.location,
        processorId: config.processorId,
        content: validation.data.content,
        mimeType: validation.data.mimeType,
      },
      processor,
    );

    const loggableTypes = new Set([
      "currency",
      "receipt_date",
      "supplier_name",
      "total_amount",
      "registration_number",
    ]);
    const logEntities = entities.map((e) =>
      loggableTypes.has(e.type ?? "")
        ? { type: e.type, mentionText: e.mentionText, confidence: e.confidence }
        : { type: e.type, confidence: e.confidence },
    );
    console.log(`[AI] entities:`, JSON.stringify(logEntities));
    const body = { entities };
    console.log(`[RES] 200 entities=${entities.length}`);
    res.status(200).json(body);
  } catch (e: unknown) {
    console.error("parseDocument 失敗:", e);
    const body = { error: "内部サーバーエラー" };
    console.log(`[RES] 500`, JSON.stringify(body));
    res.status(500).json(body);
  }
};
