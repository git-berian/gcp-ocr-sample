import { vi } from "vitest";
import type { handleParseDocument } from "../../../src/handlers/parse-document.js";
import type { handleParseDocumentCall } from "../../../src/handlers/parse-document-call.js";

export const TEST_ENV = {
  GCP_PROJECT_ID: "test-project",
  DOCAI_LOCATION: "us",
  DOCAI_PROCESSOR_ID: "proc-123",
  GEMINI_LOCATION: "global",
  GEMINI_MODEL: "gemini-2.5-flash",
  CLAUDE_LOCATION: "global",
  CLAUDE_MODEL: "claude-opus-4-8",
  API_KEY: "test-api-key-12345",
} as const;

export const EXPECTED_PROCESSOR_NAME = `projects/${TEST_ENV.GCP_PROJECT_ID}/locations/${TEST_ENV.DOCAI_LOCATION}/processors/${TEST_ENV.DOCAI_PROCESSOR_ID}`;

export const VALID_REQUEST_BODY = {
  content: "base64data",
  mimeType: "application/pdf",
};

// ---- Document AI 用フィクスチャ ----
export const MOCK_DOCAI_TEXT = "領収書\nテスト商店\n2026年5月16日\n¥4,800\nT1234567890123";

export const MOCK_DOCAI_ENTITIES = [
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

export const MOCK_SDK_RESPONSE = [
  { document: { entities: MOCK_DOCAI_ENTITIES, text: MOCK_DOCAI_TEXT } },
];

export const EXPECTED_DOCAI_RECEIPT = {
  supplierName: "テスト商店",
  receiptDate: "2026-05-16",
  totalAmount: 4800,
  taxAmount: 436,
  registrationNumber: "T1234567890123",
  transcription: MOCK_DOCAI_TEXT,
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
};

// ---- Gemini 用フィクスチャ ----
export const MOCK_RECEIPT_FIELDS = {
  supplierName: "テスト商店",
  receiptDate: "2026-05-16",
  totalAmount: 4800,
  taxAmount: 436,
  registrationNumber: "T1234567890123",
  transcription: "領収書 テスト商店 4800円 T1234567890123",
};

export const MOCK_GEMINI_RESPONSE = { text: JSON.stringify(MOCK_RECEIPT_FIELDS) };

export const EXPECTED_GEMINI_RECEIPT = {
  ...MOCK_RECEIPT_FIELDS,
  meta: { source: "gemini" },
};

// ---- Claude 用フィクスチャ ----
export const MOCK_CLAUDE_RESPONSE = {
  content: [{ type: "text", text: JSON.stringify(MOCK_RECEIPT_FIELDS) }],
};

export const EXPECTED_CLAUDE_RECEIPT = {
  ...MOCK_RECEIPT_FIELDS,
  meta: { source: "claude" },
};

type HandlerParams = Parameters<typeof handleParseDocument>;

export function createMockReqRes(
  overrides: Partial<{
    method: string;
    body: unknown;
    path: string;
    headers: Record<string, string>;
  }> = {},
) {
  const { headers = {}, ...rest } = overrides;
  const req = {
    method: "POST",
    path: "/parseDocument",
    body: { ...VALID_REQUEST_BODY },
    headers,
    ...rest,
  } as unknown as HandlerParams[0];

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as HandlerParams[1];

  return { req, res };
}

export function createMockCallableRequest(
  overrides: Partial<{ data: unknown; auth: unknown }> = {},
) {
  return {
    data: { ...VALID_REQUEST_BODY },
    ...overrides,
  } as Parameters<typeof handleParseDocumentCall>[0];
}
