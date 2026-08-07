import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createGeminiReceiptExtractor } from "./gemini-client.js";

const mockGenerateContent = vi.hoisted(() => vi.fn());
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent: mockGenerateContent };
  },
  Type: { OBJECT: "OBJECT", STRING: "STRING", NUMBER: "NUMBER", ARRAY: "ARRAY" },
}));

const config = {
  projectId: "test-project",
  location: "global",
  model: "gemini-3.5-flash-lite",
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

describe("createGeminiReceiptExtractor", () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("正常系: ReceiptExtraction を返し、generateContent を正しく呼ぶ", async () => {
    mockGenerateContent.mockResolvedValue({ text: JSON.stringify(fullReceipt) });

    const extractor = createGeminiReceiptExtractor(config);
    const result = await extractor.extract(params);

    expect(result).toEqual({ ...fullReceipt, meta: { source: "gemini" } });

    const arg = mockGenerateContent.mock.calls[0][0];
    expect(arg.model).toBe("gemini-3.5-flash-lite");
    expect(arg.contents[0].parts[0]).toEqual({
      inlineData: { mimeType: "image/jpeg", data: "base64data" },
    });
    expect(arg.config.responseMimeType).toBe("application/json");
    expect(arg.config.responseSchema).toBeDefined();
    expect(arg.config.thinkingConfig).toEqual({ thinkingBudget: 0 });
    expect(arg.config.httpOptions).toEqual({ timeout: 30000 });
  });

  it("空文字レスポンスでエラーを投げる", async () => {
    mockGenerateContent.mockResolvedValue({ text: "" });
    const extractor = createGeminiReceiptExtractor(config);
    await expect(extractor.extract(params)).rejects.toThrow(
      "Gemini から空のレスポンスが返されました",
    );
  });

  it("text が undefined でもエラーを投げる", async () => {
    mockGenerateContent.mockResolvedValue({});
    const extractor = createGeminiReceiptExtractor(config);
    await expect(extractor.extract(params)).rejects.toThrow(
      "Gemini から空のレスポンスが返されました",
    );
  });

  it("不正な JSON でエラーを投げる", async () => {
    mockGenerateContent.mockResolvedValue({ text: "not json{" });
    const extractor = createGeminiReceiptExtractor(config);
    await expect(extractor.extract(params)).rejects.toThrow(
      "Gemini レスポンスの JSON 解析に失敗しました",
    );
  });

  it("金額の文字列・空文字・登録番号を正規化する", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        supplierName: "",
        receiptDate: null,
        totalAmount: "¥1,234",
        taxAmount: "１２３",
        registrationNumber: "",
        transcription: "t",
      }),
    });

    const extractor = createGeminiReceiptExtractor(config);
    const result = await extractor.extract(params);

    expect(result.supplierName).toBeNull();
    expect(result.receiptDate).toBeNull();
    expect(result.totalAmount).toBe(1234);
    expect(result.taxAmount).toBe(123);
    expect(result.registrationNumber).toBeNull();
    expect(result.meta).toEqual({ source: "gemini" });
  });

  it("receiptDate が YYYY-MM-DD 以外なら null にする（契約担保）", async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ ...fullReceipt, receiptDate: "2026/05/16" }),
    });

    const extractor = createGeminiReceiptExtractor(config);
    const result = await extractor.extract(params);

    expect(result.receiptDate).toBeNull();
  });

  it("SDK エラーは呼び出し元に伝播する", async () => {
    mockGenerateContent.mockRejectedValue(new Error("Vertex error"));
    const extractor = createGeminiReceiptExtractor(config);
    await expect(extractor.extract(params)).rejects.toThrow("Vertex error");
  });
});
