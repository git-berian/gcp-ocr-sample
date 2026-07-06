import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createClaudeReceiptExtractor } from "./claude-client.js";

const mockCreate = vi.hoisted(() => vi.fn());
vi.mock("@anthropic-ai/vertex-sdk", () => ({
  AnthropicVertex: class {
    messages = { create: mockCreate };
  },
}));

const config = {
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
    mockCreate.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("正常系: ReceiptExtraction を返し、messages.create を正しく呼ぶ", async () => {
    mockCreate.mockResolvedValue(textResponse(JSON.stringify(fullReceipt)));

    const extractor = createClaudeReceiptExtractor(config);
    const result = await extractor.extract(params);

    expect(result).toEqual({ ...fullReceipt, meta: { source: "claude" } });

    const arg = mockCreate.mock.calls[0][0];
    expect(arg.model).toBe("claude-opus-4-8");
    expect(arg.messages[0].content[0]).toEqual({
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: "base64data" },
    });
    expect(arg.output_config.format.type).toBe("json_schema");
    expect(arg.output_config.format.schema).toBeDefined();
    // タイムアウトはリクエストオプション（第2引数）で渡す
    expect(mockCreate.mock.calls[0][1]).toEqual({ timeout: 30000 });
  });

  it("サンプリングパラメータと thinking を送らない（claude-opus-4-8 は 400 になるため）", async () => {
    mockCreate.mockResolvedValue(textResponse(JSON.stringify(fullReceipt)));

    const extractor = createClaudeReceiptExtractor(config);
    await extractor.extract(params);

    const arg = mockCreate.mock.calls[0][0];
    expect(arg.temperature).toBeUndefined();
    expect(arg.top_p).toBeUndefined();
    expect(arg.top_k).toBeUndefined();
    expect(arg.thinking).toBeUndefined();
  });

  it("PDF は document ブロックで送る", async () => {
    mockCreate.mockResolvedValue(textResponse(JSON.stringify(fullReceipt)));

    const extractor = createClaudeReceiptExtractor(config);
    await extractor.extract({ content: "pdfbase64", mimeType: "application/pdf" });

    const arg = mockCreate.mock.calls[0][0];
    expect(arg.messages[0].content[0]).toEqual({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: "pdfbase64" },
    });
  });

  it("stop_reason が max_tokens なら打ち切りエラーを投げる（JSON 解析前）", async () => {
    mockCreate.mockResolvedValue({
      stop_reason: "max_tokens",
      content: [{ type: "text", text: '{"supplierName":"テ' }],
    });
    const extractor = createClaudeReceiptExtractor(config);
    await expect(extractor.extract(params)).rejects.toThrow(
      "Claude の出力が max_tokens で打ち切られました（transcription が長すぎる可能性）",
    );
  });

  it("stop_reason が refusal なら拒否エラーを投げる", async () => {
    mockCreate.mockResolvedValue({ stop_reason: "refusal", content: [] });
    const extractor = createClaudeReceiptExtractor(config);
    await expect(extractor.extract(params)).rejects.toThrow(
      "Claude がリクエストを拒否しました（refusal）",
    );
  });

  it("text ブロックが無ければエラーを投げる", async () => {
    mockCreate.mockResolvedValue({ content: [] });
    const extractor = createClaudeReceiptExtractor(config);
    await expect(extractor.extract(params)).rejects.toThrow(
      "Claude から空のレスポンスが返されました",
    );
  });

  it("空文字の text ブロックでエラーを投げる", async () => {
    mockCreate.mockResolvedValue(textResponse("   "));
    const extractor = createClaudeReceiptExtractor(config);
    await expect(extractor.extract(params)).rejects.toThrow(
      "Claude から空のレスポンスが返されました",
    );
  });

  it("不正な JSON でエラーを投げる", async () => {
    mockCreate.mockResolvedValue(textResponse("not json{"));
    const extractor = createClaudeReceiptExtractor(config);
    await expect(extractor.extract(params)).rejects.toThrow(
      "Claude レスポンスの JSON 解析に失敗しました",
    );
  });

  it("金額の文字列・空文字・登録番号を正規化する", async () => {
    mockCreate.mockResolvedValue(
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

    const extractor = createClaudeReceiptExtractor(config);
    const result = await extractor.extract(params);

    expect(result.supplierName).toBeNull();
    expect(result.receiptDate).toBeNull();
    expect(result.totalAmount).toBe(1234);
    expect(result.taxAmount).toBe(123);
    expect(result.registrationNumber).toBeNull();
    expect(result.meta).toEqual({ source: "claude" });
  });

  it("receiptDate が YYYY-MM-DD 以外なら null にする（契約担保）", async () => {
    mockCreate.mockResolvedValue(
      textResponse(JSON.stringify({ ...fullReceipt, receiptDate: "2026/05/16" })),
    );

    const extractor = createClaudeReceiptExtractor(config);
    const result = await extractor.extract(params);

    expect(result.receiptDate).toBeNull();
  });

  it("SDK エラーは呼び出し元に伝播する", async () => {
    mockCreate.mockRejectedValue(new Error("Vertex error"));
    const extractor = createClaudeReceiptExtractor(config);
    await expect(extractor.extract(params)).rejects.toThrow("Vertex error");
  });
});
