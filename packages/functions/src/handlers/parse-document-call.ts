import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { validateParseDocumentRequest } from "../infrastructure/request-validator.js";
import { loadFunctionsConfig } from "../infrastructure/config.js";
import { createDocumentAiReceiptExtractor } from "../infrastructure/document-ai-client.js";
import { extractReceipt, type ReceiptExtraction } from "../application/extract-receipt.js";

export const handleParseDocumentCall = async (
  request: CallableRequest,
): Promise<{ receipt: ReceiptExtraction }> => {
  const validation = validateParseDocumentRequest(request.data);
  if (!validation.ok) {
    throw new HttpsError("invalid-argument", validation.message);
  }

  try {
    const config = loadFunctionsConfig();
    const extractor = createDocumentAiReceiptExtractor(config);

    const receipt = await extractReceipt(
      {
        content: validation.data.content,
        mimeType: validation.data.mimeType,
      },
      extractor,
    );

    return { receipt };
  } catch (e: unknown) {
    console.error("extractReceipt 失敗:", e);
    throw new HttpsError("internal", "内部サーバーエラー");
  }
};
