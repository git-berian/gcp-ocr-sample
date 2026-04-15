import type { Entity } from "../../../src/api/types";

export const MOCK_ENTITIES: Entity[] = [
  { type: "total_amount", mentionText: "1,234", confidence: 0.95 },
  { type: "date", mentionText: "2024-01-15", confidence: 0.9 },
];

export const MOCK_API_RESPONSE = { data: { entities: MOCK_ENTITIES } };

export function createTestFile(
  name: string = "receipt.pdf",
  type: string = "application/pdf",
  content: string = "dummy-content",
): File {
  return new File([content], name, { type });
}
