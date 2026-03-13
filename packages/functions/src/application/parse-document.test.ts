import { describe, it, expect, vi } from "vitest";
import { parseDocument } from "./parse-document.js";
import type { DocumentProcessor } from "./parse-document.js";

describe("parseDocument", () => {
  const mockEntities = [{ type: "total_amount", mentionText: "1,234", confidence: 0.95 }];

  function createMockProcessor(): DocumentProcessor {
    return { process: vi.fn().mockResolvedValue(mockEntities) };
  }

  it("正しいprocessor名を構築してprocessを呼ぶ", async () => {
    const processor = createMockProcessor();
    await parseDocument(
      {
        projectId: "my-project",
        location: "us",
        processorId: "proc-123",
        content: "base64content",
        mimeType: "application/pdf",
      },
      processor,
    );

    expect(processor.process).toHaveBeenCalledWith({
      name: "projects/my-project/locations/us/processors/proc-123",
      content: "base64content",
      mimeType: "application/pdf",
    });
  });

  it("entitiesを返す", async () => {
    const processor = createMockProcessor();
    const result = await parseDocument(
      {
        projectId: "my-project",
        location: "us",
        processorId: "proc-123",
        content: "base64content",
        mimeType: "application/pdf",
      },
      processor,
    );

    expect(result).toEqual(mockEntities);
  });
});
