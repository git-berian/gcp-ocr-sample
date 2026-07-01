import { GoogleGenAI, Type, type Schema } from "@google/genai";
import type {
  ReceiptExtraction,
  ReceiptExtractor,
  ReceiptLineItem,
} from "../application/extract-receipt.js";

const PROMPT = `あなたは日本の領収書・レシートの読み取り専門家です。
画像から領収書情報を抽出し、指定スキーマの JSON のみを返してください。手書き文字も可能な限り正確に読み取ること。
- receiptDate は YYYY-MM-DD 形式。不明なら null。
- totalAmount / taxAmount / lineItems[].amount は通貨記号・カンマを除いた数値のみ。不明なら null。
- transcription は画像内に見えるテキストの書き起こし。`;

const RECEIPT_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    supplierName: { type: Type.STRING, nullable: true },
    receiptDate: { type: Type.STRING, nullable: true },
    totalAmount: { type: Type.NUMBER, nullable: true },
    taxAmount: { type: Type.NUMBER, nullable: true },
    lineItems: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          amount: { type: Type.NUMBER, nullable: true },
        },
        required: ["description", "amount"],
      },
    },
    transcription: { type: Type.STRING },
  },
  required: [
    "supplierName",
    "receiptDate",
    "totalAmount",
    "taxAmount",
    "lineItems",
    "transcription",
  ],
};

export function createReceiptExtractor(config: {
  projectId: string;
  location: string;
  model: string;
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

      return normalizeReceiptExtraction(parsed);
    },
  };
}

function normalizeReceiptExtraction(parsed: unknown): ReceiptExtraction {
  const obj = (parsed && typeof parsed === "object" ? parsed : {}) as Record<string, unknown>;
  return {
    supplierName: toStringOrNull(obj.supplierName),
    receiptDate: toStringOrNull(obj.receiptDate),
    totalAmount: toNumberOrNull(obj.totalAmount),
    taxAmount: toNumberOrNull(obj.taxAmount),
    lineItems: Array.isArray(obj.lineItems) ? obj.lineItems.map(normalizeLineItem) : [],
    transcription: typeof obj.transcription === "string" ? obj.transcription : "",
  };
}

function normalizeLineItem(item: unknown): ReceiptLineItem {
  const obj = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
  return {
    description: typeof obj.description === "string" ? obj.description : "",
    amount: toNumberOrNull(obj.amount),
  };
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const normalized = value
      .replace(/[０-９]/g, (d) => "０１２３４５６７８９".indexOf(d).toString())
      .replace(/[^0-9.-]/g, "");
    if (normalized === "" || normalized === "-" || normalized === ".") {
      return null;
    }
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
