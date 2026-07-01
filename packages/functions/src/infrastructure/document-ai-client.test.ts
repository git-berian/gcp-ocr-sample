import { describe, it, expect, vi, afterEach } from "vitest";
import { DocumentProcessorServiceClient } from "@google-cloud/documentai";
import {
  createDocumentAiReceiptExtractor,
  mapEntitiesToReceipt,
  type DocumentEntity,
} from "./document-ai-client.js";

vi.mock("@google-cloud/documentai");

function setupMockClient(mockProcessDocument: ReturnType<typeof vi.fn>) {
  vi.mocked(DocumentProcessorServiceClient).mockImplementation(function () {
    return { processDocument: mockProcessDocument } as unknown as DocumentProcessorServiceClient;
  } as unknown as ConstructorParameters<typeof DocumentProcessorServiceClient>[0] &
    (() => DocumentProcessorServiceClient));
}

const config = { projectId: "p", location: "us", processorId: "x" };
const params = { content: "base64content", mimeType: "application/pdf" };

describe("mapEntitiesToReceipt", () => {
  it("normalizedValue（money/date）優先で正規化し、confidence を meta に退避する", () => {
    const entities: DocumentEntity[] = [
      { type: "supplier_name", mentionText: "テスト商店", confidence: 0.9 },
      {
        type: "receipt_date",
        mentionText: "2026年5月16日",
        confidence: 0.95,
        normalizedValue: { dateValue: { year: 2026, month: 5, day: 16 } },
      },
      {
        type: "total_amount",
        mentionText: "¥4,800",
        confidence: 0.88,
        normalizedValue: { moneyValue: { units: 4800, nanos: 0 } },
      },
      {
        type: "total_tax_amount",
        mentionText: "¥436",
        confidence: 0.7,
        normalizedValue: { moneyValue: { units: 436 } },
      },
      { type: "registration_number", mentionText: "T1234567890123", confidence: 0.8 },
    ];

    const receipt = mapEntitiesToReceipt(entities, "OCR全文");

    expect(receipt).toEqual({
      supplierName: "テスト商店",
      receiptDate: "2026-05-16",
      totalAmount: 4800,
      taxAmount: 436,
      registrationNumber: "T1234567890123",
      transcription: "OCR全文",
      meta: {
        source: "document-ai",
        confidence: {
          supplier_name: 0.9,
          receipt_date: 0.95,
          total_amount: 0.88,
          total_tax_amount: 0.7,
          registration_number: 0.8,
        },
      },
    });
  });

  it("normalizedValue が無い場合は mentionText をコアースする", () => {
    const entities: DocumentEntity[] = [
      { type: "total_amount", mentionText: "1,234" },
      { type: "receipt_date", mentionText: "2026-03-20" },
    ];

    const receipt = mapEntitiesToReceipt(entities, "");

    expect(receipt.totalAmount).toBe(1234);
    expect(receipt.receiptDate).toBe("2026-03-20");
  });

  it("同一 type が複数あるときは最も confidence が高いものを採用する", () => {
    const entities: DocumentEntity[] = [
      { type: "total_amount", mentionText: "500", confidence: 0.3 },
      { type: "total_amount", mentionText: "4800", confidence: 0.9 },
    ];

    const receipt = mapEntitiesToReceipt(entities, "");

    expect(receipt.totalAmount).toBe(4800);
    expect(receipt.meta?.confidence?.total_amount).toBe(0.9);
  });

  it("dateValue が無く mentionText が YYYY-MM-DD 以外なら null（契約担保）", () => {
    const entities: DocumentEntity[] = [
      { type: "receipt_date", mentionText: "令和6年3月15日", confidence: 0.9 },
    ];

    const receipt = mapEntitiesToReceipt(entities, "");

    expect(receipt.receiptDate).toBeNull();
  });

  it("該当エンティティが無ければ null、明細やその他 type は無視する", () => {
    const entities: DocumentEntity[] = [
      { type: "currency", mentionText: "¥", confidence: 0.5 },
      { type: "line_item", mentionText: "コーヒー 500" },
    ];

    const receipt = mapEntitiesToReceipt(entities, "text");

    expect(receipt.supplierName).toBeNull();
    expect(receipt.receiptDate).toBeNull();
    expect(receipt.totalAmount).toBeNull();
    expect(receipt.taxAmount).toBeNull();
    expect(receipt.registrationNumber).toBeNull();
    expect(receipt.transcription).toBe("text");
    expect(receipt.meta?.confidence).toEqual({ currency: 0.5 });
  });
});

describe("createDocumentAiReceiptExtractor", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("processDocument を呼び、entities + document.text を receipt にマップする", async () => {
    const mockProcessDocument = vi.fn().mockResolvedValue([
      {
        document: {
          text: "OCR全文",
          entities: [{ type: "supplier_name", mentionText: "テスト商店", confidence: 0.9 }],
        },
      },
    ]);
    setupMockClient(mockProcessDocument);

    const extractor = createDocumentAiReceiptExtractor(config);
    const result = await extractor.extract(params);

    expect(mockProcessDocument).toHaveBeenCalledWith({
      name: "projects/p/locations/us/processors/x",
      rawDocument: { content: "base64content", mimeType: "application/pdf" },
    });
    expect(result.supplierName).toBe("テスト商店");
    expect(result.transcription).toBe("OCR全文");
    expect(result.meta?.source).toBe("document-ai");
  });

  it("document が null の場合でも空の receipt を返す", async () => {
    const mockProcessDocument = vi.fn().mockResolvedValue([{ document: null }]);
    setupMockClient(mockProcessDocument);

    const extractor = createDocumentAiReceiptExtractor(config);
    const result = await extractor.extract(params);

    expect(result.supplierName).toBeNull();
    expect(result.transcription).toBe("");
  });

  it("processDocument が失敗した場合、エラーが呼び出し元に伝播する", async () => {
    const mockProcessDocument = vi.fn().mockRejectedValue(new Error("Document AI API error"));
    setupMockClient(mockProcessDocument);

    const extractor = createDocumentAiReceiptExtractor(config);

    await expect(extractor.extract(params)).rejects.toThrow("Document AI API error");
  });
});
