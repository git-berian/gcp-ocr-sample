import { DocumentProcessorServiceClient } from "@google-cloud/documentai";
import type { ReceiptExtraction, ReceiptExtractor } from "../application/extract-receipt.js";
import {
  dateFromParts,
  moneyToNumber,
  toIsoDateOrNull,
  toNumberOrNull,
  toStringOrNull,
} from "../application/receipt-normalize.js";

/** Document AI Entity のうちマッピングで使う最小構造（infra 層に閉じ込める）。 */
export interface DocumentEntity {
  type?: string | null;
  mentionText?: string | null;
  confidence?: number | null;
  normalizedValue?: {
    dateValue?: { year?: number | null; month?: number | null; day?: number | null } | null;
    moneyValue?: { units?: number | string | null; nanos?: number | null } | null;
  } | null;
}

export function createDocumentAiReceiptExtractor(config: {
  projectId: string;
  location: string;
  processorId: string;
}): ReceiptExtractor {
  const client = new DocumentProcessorServiceClient({
    apiEndpoint: `${config.location}-documentai.googleapis.com`,
  });
  const name = `projects/${config.projectId}/locations/${config.location}/processors/${config.processorId}`;

  return {
    async extract(params: { content: string; mimeType: string }): Promise<ReceiptExtraction> {
      const [result] = await client.processDocument({
        name,
        rawDocument: { content: params.content, mimeType: params.mimeType },
      });

      const entities = (result.document?.entities ?? []) as unknown as DocumentEntity[];
      const text = result.document?.text ?? "";
      return mapEntitiesToReceipt(entities, text);
    },
  };
}

/** Document AI の entities + OCR 全文を正準モデル ReceiptExtraction にマップする。 */
export function mapEntitiesToReceipt(entities: DocumentEntity[], text: string): ReceiptExtraction {
  // 同一 type が複数ある場合は最も confidence が高いものを採用する（last-wins を防ぐ）。
  const bestByType = new Map<string, DocumentEntity>();
  const confidence: Record<string, number> = {};

  for (const entity of entities) {
    const type = entity.type ?? "";
    if (!type) continue;

    const conf = typeof entity.confidence === "number" ? entity.confidence : 0;
    const existing = bestByType.get(type);
    const existingConf = typeof existing?.confidence === "number" ? existing.confidence : 0;
    if (!existing || conf > existingConf) {
      bestByType.set(type, entity);
    }
    if (typeof entity.confidence === "number") {
      confidence[type] = Math.max(confidence[type] ?? entity.confidence, entity.confidence);
    }
  }

  const supplier = bestByType.get("supplier_name");
  const date = bestByType.get("receipt_date");
  const total = bestByType.get("total_amount");
  const tax = bestByType.get("total_tax_amount");
  const registration = bestByType.get("registration_number");

  return {
    supplierName: supplier ? toStringOrNull(supplier.mentionText) : null,
    receiptDate: date
      ? (dateFromParts(date.normalizedValue?.dateValue) ?? toIsoDateOrNull(date.mentionText))
      : null,
    totalAmount: total
      ? (moneyToNumber(total.normalizedValue?.moneyValue) ?? toNumberOrNull(total.mentionText))
      : null,
    taxAmount: tax
      ? (moneyToNumber(tax.normalizedValue?.moneyValue) ?? toNumberOrNull(tax.mentionText))
      : null,
    registrationNumber: registration ? toStringOrNull(registration.mentionText) : null,
    transcription: text,
    meta: { source: "document-ai", confidence },
  };
}
