import { vi } from "vitest";
import type { handleParseDocument } from "../../../src/handlers/parse-document.js";

export const TEST_ENV = {
  GCP_PROJECT_ID: "test-project",
  DOCAI_LOCATION: "us",
  DOCAI_PROCESSOR_ID: "proc-123",
  API_KEY: "test-api-key-12345",
} as const;

export const EXPECTED_PROCESSOR_NAME = `projects/${TEST_ENV.GCP_PROJECT_ID}/locations/${TEST_ENV.DOCAI_LOCATION}/processors/${TEST_ENV.DOCAI_PROCESSOR_ID}`;

export const MOCK_ENTITIES = [{ type: "total_amount", mentionText: "1,234", confidence: 0.95 }];

export const MOCK_SDK_RESPONSE = [{ document: { entities: MOCK_ENTITIES } }];

export const VALID_REQUEST_BODY = {
  content: "base64data",
  mimeType: "application/pdf",
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
  };
}
