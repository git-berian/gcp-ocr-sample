import type { Request } from "firebase-functions/v2/https";
import { validateApiKey } from "../infrastructure/auth-validator.js";
import { validateParseDocumentRequest } from "../infrastructure/request-validator.js";
import { loadClaudeConfig } from "../infrastructure/config.js";
import { createClaudeReceiptExtractor } from "../infrastructure/claude-client.js";
import { extractReceipt } from "../application/extract-receipt.js";

interface JsonResponse {
  status(code: number): JsonResponse;
  json(body: unknown): JsonResponse;
}

export const handleParseDocumentClaude = async (req: Request, res: JsonResponse): Promise<void> => {
  console.log(`[${req.method}] ${req.path}`);

  if (req.method !== "POST") {
    const body = { error: "許可されていないメソッドです。POST を使用してください。" };
    console.log(`[RES] 405`, JSON.stringify(body));
    res.status(405).json(body);
    return;
  }

  const authResult = validateApiKey(req.headers.authorization, process.env.FUNCTIONS_API_KEY ?? "");
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
    const config = loadClaudeConfig();
    const extractor = createClaudeReceiptExtractor(config);

    const receipt = await extractReceipt(
      {
        content: validation.data.content,
        mimeType: validation.data.mimeType,
      },
      extractor,
    );

    // 領収書は店名・金額・登録番号など PII/取引情報を含むため、値そのものは
    // ログに出さない。抽出可否（デバッグに有用）と source のみを記録する。
    console.log(
      `[AI] receipt extracted`,
      JSON.stringify({
        source: receipt.meta?.source,
        hasSupplierName: receipt.supplierName !== null,
        hasReceiptDate: receipt.receiptDate !== null,
        hasTotalAmount: receipt.totalAmount !== null,
        hasRegistrationNumber: receipt.registrationNumber !== null,
      }),
    );
    const body = { receipt };
    console.log(`[RES] 200 receipt`);
    res.status(200).json(body);
  } catch (e: unknown) {
    console.error("extractReceipt 失敗:", e);
    const body = { error: "内部サーバーエラー" };
    console.log(`[RES] 500`, JSON.stringify(body));
    res.status(500).json(body);
  }
};
