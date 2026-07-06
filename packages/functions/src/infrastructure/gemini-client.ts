import { GoogleGenAI, Type, type Schema } from "@google/genai";
import type { ReceiptExtraction, ReceiptExtractor } from "../application/extract-receipt.js";
import { normalizeReceiptExtraction } from "../application/receipt-normalize.js";

const PROMPT = `あなたは日本の領収書・レシートの読み取り専門家です。
画像から領収書情報を抽出し、指定スキーマの JSON のみを返してください。手書き文字も可能な限り正確に読み取ること。
- receiptDate は支払日を YYYY-MM-DD 形式。不明なら null。
- totalAmount / taxAmount は通貨記号・カンマを除いた数値のみ。不明なら null。
- registrationNumber はインボイス登録番号（"T" + 数字13桁）。記載が無ければ null。
- transcription は画像内に見えるテキストの書き起こし。`;

const RECEIPT_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    supplierName: { type: Type.STRING, nullable: true },
    receiptDate: { type: Type.STRING, nullable: true },
    totalAmount: { type: Type.NUMBER, nullable: true },
    taxAmount: { type: Type.NUMBER, nullable: true },
    registrationNumber: { type: Type.STRING, nullable: true },
    transcription: { type: Type.STRING },
  },
  required: [
    "supplierName",
    "receiptDate",
    "totalAmount",
    "taxAmount",
    "registrationNumber",
    "transcription",
  ],
};

export function createGeminiReceiptExtractor(config: {
  projectId: string;
  location: string;
  model: string;
  timeoutMs: number;
}): ReceiptExtractor {
  const ai = new GoogleGenAI({
    vertexai: true,
    project: config.projectId,
    location: config.location,
  });

  return {
    async extract(params: { content: string; mimeType: string }): Promise<ReceiptExtraction> {
      const response = await ai.models.generateContent({
        model: config.model,
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: params.mimeType, data: params.content } },
              { text: PROMPT },
            ],
          },
        ],
        config: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: RECEIPT_RESPONSE_SCHEMA,
          thinkingConfig: { thinkingBudget: 0 },
          httpOptions: { timeout: config.timeoutMs },
        },
      });

      const text = response.text;
      if (!text || text.trim().length === 0) {
        throw new Error("Gemini から空のレスポンスが返されました");
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("Gemini レスポンスの JSON 解析に失敗しました");
      }

      return normalizeReceiptExtraction(parsed, "gemini");
    },
  };
}
