import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { validateParseDocumentRequest } from "../infrastructure/request-validator.js";
import { loadFunctionsConfig } from "../infrastructure/config.js";
import { createDocumentProcessor } from "../infrastructure/document-ai-client.js";
import { parseDocument, type ExtractedField } from "../application/parse-document.js";

export const handleParseDocumentCall = async (
  request: CallableRequest,
): Promise<{ entities: ExtractedField[] }> => {
  const validation = validateParseDocumentRequest(request.data);
  if (!validation.ok) {
    throw new HttpsError("invalid-argument", validation.message);
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

    return { entities };
  } catch (e: unknown) {
    console.error("parseDocument 失敗:", e);
    throw new HttpsError("internal", "内部サーバーエラー");
  }
};
