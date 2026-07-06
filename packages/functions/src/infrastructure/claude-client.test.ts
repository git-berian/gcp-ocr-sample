import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createClaudeReceiptExtractor } from "./claude-client.js";
import type { ClaudeConfig } from "./config.js";

// api / vertex 両トランスポートの SDK をモックする。
const mockApiCreate = vi.hoisted(() => vi.fn());
const mockVertexCreate = vi.hoisted(() => vi.fn());
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: mockApiCreate };
  },
}));
vi.mock("@anthropic-ai/vertex-sdk", () => ({
  AnthropicVertex: class {
    messages = { create: mockVertexCreate };
  },
}));

const apiConfig: ClaudeConfig = {
  transport: "api",
  apiKey: "sk-ant-test",
  model: "claude-opus-4-8",
  timeoutMs: 30000,
};
const vertexConfig: ClaudeConfig = {
  transport: "vertex",
  projectId: "test-project",
  location: "global",
  model: "claude-opus-4-8",
  timeoutMs: 30000,
};
const params = { content: "base64data", mimeType: "image/jpeg" };

const fullReceipt = {
  supplierName: "テスト商店",
  receiptDate: "2026-05-16",
  totalAmount: 4800,
  taxAmount: 436,
  registrationNumber: "T1234567890123",
  transcription: "領収書 4800円",
};

function textResponse(text: string) {
  return { content: [{ type: "text", text }] };
}

describe("createClaudeReceiptExtractor", () => {
  beforeEach(() => {
    mockApiCreate.mockReset();
    mockVertexCreate.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("トランスポート切替", () => {
    it("api: Anthropic 直接 API を使い、Vertex は呼ばない", async () => {
      mockApiCreate.mockResolvedValue(textResponse(JSON.stringify(fullReceipt)));

      const result = await createClaudeReceiptExtractor(apiConfig).extract(params);

      expect(result).toEqual({ ...fullReceipt, meta: { source: "claude" } });
      expect(mockApiCreate).toHaveBeenCalledTimes(1);
      expect(mockVertexCreate).not.toHaveBeenCalled();
    });

    it("vertex: AnthropicVertex を使い、api は呼ばない", async () => {
      mockVertexCreate.mockResolvedValue(textResponse(JSON.stringify(fullReceipt)));

      const result = await createClaudeReceiptExtractor(vertexConfig).extract(params);

      expect(result).toEqual({ ...fullReceipt, meta: { source: "claude" } });
      expect(mockVertexCreate).toHaveBeenCalledTimes(1);
      expect(mockApiCreate).not.toHaveBeenCalled();
    });
  });

  describe("共有ロジック（api トランスポートで検証）", () => {
    it("正常系: messages.create を正しく呼ぶ", async () => {
      mockApiCreate.mockResolvedValue(textResponse(JSON.stringify(fullReceipt)));

      await createClaudeReceiptExtractor(apiConfig).extract(params);

      const arg = mockApiCreate.mock.calls[0][0];
      expect(arg.model).toBe("claude-opus-4-8");
      expect(arg.messages[0].content[0]).toEqual({
        type: "image",
        source: { type: "base64", media_type: "image/jpeg", data: "base64data" },
      });
      expect(arg.output_config.format.type).toBe("json_schema");
      expect(arg.output_config.format.schema).toBeDefined();
      // タイムアウトはリクエストオプション（第2引数）で渡す
      expect(mockApiCreate.mock.calls[0][1]).toEqual({ timeout: 30000 });
    });

    it("サンプリングパラメータと thinking を送らない（400 回避）", async () => {
      mockApiCreate.mockResolvedValue(textResponse(JSON.stringify(fullReceipt)));

      await createClaudeReceiptExtractor(apiConfig).extract(params);

      const arg = mockApiCreate.mock.calls[0][0];
      expect(arg.temperature).toBeUndefined();
      expect(arg.top_p).toBeUndefined();
      expect(arg.top_k).toBeUndefined();
      expect(arg.thinking).toBeUndefined();
    });

    it("PDF は document ブロックで送る", async () => {
      mockApiCreate.mockResolvedValue(textResponse(JSON.stringify(fullReceipt)));

      await createClaudeReceiptExtractor(apiConfig).extract({
        content: "pdfbase64",
        mimeType: "application/pdf",
      });

      const arg = mockApiCreate.mock.calls[0][0];
      expect(arg.messages[0].content[0]).toEqual({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: "pdfbase64" },
      });
    });

    it("stop_reason が max_tokens なら打ち切りエラーを投げる（JSON 解析前）", async () => {
      mockApiCreate.mockResolvedValue({
        stop_reason: "max_tokens",
        content: [{ type: "text", text: '{"supplierName":"テ' }],
      });
      await expect(createClaudeReceiptExtractor(apiConfig).extract(params)).rejects.toThrow(
        "Claude の出力が max_tokens で打ち切られました（transcription が長すぎる可能性）",
      );
    });

    it("stop_reason が refusal なら拒否エラーを投げる", async () => {
      mockApiCreate.mockResolvedValue({ stop_reason: "refusal", content: [] });
      await expect(createClaudeReceiptExtractor(apiConfig).extract(params)).rejects.toThrow(
        "Claude がリクエストを拒否しました（refusal）",
      );
    });

    it("text ブロックが無ければエラーを投げる", async () => {
      mockApiCreate.mockResolvedValue({ content: [] });
      await expect(createClaudeReceiptExtractor(apiConfig).extract(params)).rejects.toThrow(
        "Claude から空のレスポンスが返されました",
      );
    });

    it("空文字の text ブロックでエラーを投げる", async () => {
      mockApiCreate.mockResolvedValue(textResponse("   "));
      await expect(createClaudeReceiptExtractor(apiConfig).extract(params)).rejects.toThrow(
        "Claude から空のレスポンスが返されました",
      );
    });

    it("不正な JSON でエラーを投げる", async () => {
      mockApiCreate.mockResolvedValue(textResponse("not json{"));
      await expect(createClaudeReceiptExtractor(apiConfig).extract(params)).rejects.toThrow(
        "Claude レスポンスの JSON 解析に失敗しました",
      );
    });

    it("金額の文字列・空文字・登録番号を正規化する", async () => {
      mockApiCreate.mockResolvedValue(
        textResponse(
          JSON.stringify({
            supplierName: "",
            receiptDate: null,
            totalAmount: "¥1,234",
            taxAmount: "１２３",
            registrationNumber: "",
            transcription: "t",
          }),
        ),
      );

      const result = await createClaudeReceiptExtractor(apiConfig).extract(params);

      expect(result.supplierName).toBeNull();
      expect(result.receiptDate).toBeNull();
      expect(result.totalAmount).toBe(1234);
      expect(result.taxAmount).toBe(123);
      expect(result.registrationNumber).toBeNull();
      expect(result.meta).toEqual({ source: "claude" });
    });

    it("receiptDate が YYYY-MM-DD 以外なら null にする（契約担保）", async () => {
      mockApiCreate.mockResolvedValue(
        textResponse(JSON.stringify({ ...fullReceipt, receiptDate: "2026/05/16" })),
      );

      const result = await createClaudeReceiptExtractor(apiConfig).extract(params);

      expect(result.receiptDate).toBeNull();
    });

    it("SDK エラーは呼び出し元に伝播する", async () => {
      mockApiCreate.mockRejectedValue(new Error("Anthropic error"));
      await expect(createClaudeReceiptExtractor(apiConfig).extract(params)).rejects.toThrow(
        "Anthropic error",
      );
    });
  });
});
