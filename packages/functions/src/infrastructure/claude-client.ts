import Anthropic from "@anthropic-ai/sdk";
import { AnthropicVertex } from "@anthropic-ai/vertex-sdk";
import type { ReceiptExtraction, ReceiptExtractor } from "../application/extract-receipt.js";
import type { ClaudeConfig } from "./config.js";
import { normalizeReceiptExtraction } from "../application/receipt-normalize.js";

const PROMPT = `あなたは日本の領収書・レシートの読み取り専門家です。
画像から領収書情報を抽出し、指定スキーマの JSON のみを返してください。手書き文字も可能な限り正確に読み取ること。
- receiptDate は支払日を YYYY-MM-DD 形式。不明なら null。
- totalAmount / taxAmount は通貨記号・カンマを除いた数値のみ。不明なら null。
- registrationNumber はインボイス登録番号（"T" + 数字13桁）。記載が無ければ null。
- transcription は画像内に見えるテキストの書き起こし。`;

// 出力トークン上限。密な手書きレシートの transcription を含む JSON でも
// max_tokens 打ち切りが起きにくいよう余裕を持たせる（非ストリーミングのため
// SDK タイムアウトを避ける ~16000 の範囲内に収める）。打ち切り時は下記 stop_reason で検知する。
const MAX_TOKENS = 8192;

// Claude の構造化出力（output_config.format）に渡す JSON Schema。
// Gemini の responseSchema と等価。null 許容は構造化出力が明示サポートする anyOf 形式で表現し、
// 全プロパティを required・additionalProperties:false とする（構造化出力の制約）。
const NULLABLE_STRING = { anyOf: [{ type: "string" }, { type: "null" }] } as const;
const NULLABLE_NUMBER = { anyOf: [{ type: "number" }, { type: "null" }] } as const;

const RECEIPT_JSON_SCHEMA = {
  type: "object",
  properties: {
    supplierName: NULLABLE_STRING,
    receiptDate: NULLABLE_STRING,
    totalAmount: NULLABLE_NUMBER,
    taxAmount: NULLABLE_NUMBER,
    registrationNumber: NULLABLE_STRING,
    transcription: { type: "string" },
  },
  required: [
    "supplierName",
    "receiptDate",
    "totalAmount",
    "taxAmount",
    "registrationNumber",
    "transcription",
  ],
  additionalProperties: false,
} as const;

/**
 * 入力（画像 or PDF）を Anthropic のコンテンツブロックに変換する。
 * Anthropic は画像を image ブロック、PDF を document ブロックで扱うため分岐する。
 */
function buildUserContent(params: { content: string; mimeType: string }) {
  const textBlock = { type: "text" as const, text: PROMPT };

  if (params.mimeType === "application/pdf") {
    return [
      {
        type: "document" as const,
        source: {
          type: "base64" as const,
          media_type: "application/pdf" as const,
          data: params.content,
        },
      },
      textBlock,
    ];
  }

  return [
    {
      type: "image" as const,
      source: {
        type: "base64" as const,
        // request-validator が image/png | image/jpeg のみ通す
        media_type: params.mimeType as "image/png" | "image/jpeg",
        data: params.content,
      },
    },
    textBlock,
  ];
}

export function createClaudeReceiptExtractor(config: ClaudeConfig): ReceiptExtractor {
  // トランスポートでクライアント生成のみ分岐する（ADR-0013）。以降の
  // messages.create / レスポンス処理は両 SDK で同一形状のため共有する。
  // Anthropic SDK はタイムアウトも再試行するため、既定の maxRetries=2 では
  // 最悪 timeout×3 の実時間となり Cloud Functions（gen2 既定 60 秒）を超過し、
  // かつ画像 base64 を再送してトークンコストが増える。呼び出し側に外側の
  // タイムアウトがあるため再試行は無効化する。
  const client =
    config.transport === "vertex"
      ? new AnthropicVertex({
          projectId: config.projectId,
          region: config.location,
          maxRetries: 0,
        })
      : new Anthropic({ apiKey: config.apiKey, maxRetries: 0 });

  return {
    async extract(params: { content: string; mimeType: string }): Promise<ReceiptExtraction> {
      // 注意: temperature / top_p / top_k は claude-opus-4-8 では 400 になるため送らない。
      // thinking も省略で無効（ADR-0012 参照）。JSON は output_config.format で強制する。
      const message = await client.messages.create(
        {
          model: config.model,
          max_tokens: MAX_TOKENS,
          messages: [{ role: "user", content: buildUserContent(params) }],
          output_config: {
            format: { type: "json_schema", schema: RECEIPT_JSON_SCHEMA },
          },
        },
        { timeout: config.timeoutMs },
      );

      // 打ち切り・拒否を JSON 解析前に検知し、原因が分かるエラーにする。
      if (message.stop_reason === "max_tokens") {
        throw new Error(
          "Claude の出力が max_tokens で打ち切られました（transcription が長すぎる可能性）",
        );
      }
      if (message.stop_reason === "refusal") {
        throw new Error("Claude がリクエストを拒否しました（refusal）");
      }

      const textBlock = message.content.find((block) => block.type === "text");
      if (!textBlock || textBlock.type !== "text" || textBlock.text.trim().length === 0) {
        throw new Error("Claude から空のレスポンスが返されました");
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(textBlock.text);
      } catch {
        throw new Error("Claude レスポンスの JSON 解析に失敗しました");
      }

      return normalizeReceiptExtraction(parsed, "claude");
    },
  };
}
