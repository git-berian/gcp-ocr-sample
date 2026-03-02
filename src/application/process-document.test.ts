import { describe, it, expect, vi } from "vitest";
import { processDocument } from "./process-document.js";
import type { AppConfig, FileReader, DocumentProcessor } from "./process-document.js";

describe("processDocument", () => {
  const baseConfig: AppConfig = {
    projectId: "my-project",
    location: "us",
    processorId: "proc-123",
    fileName: "receipt.pdf",
  };

  const mockEntities = [{ type: "total_amount", mentionText: "1,234", confidence: 0.95 }];

  function createMocks() {
    return {
      fileReader: { readAsBase64: vi.fn().mockReturnValue("base64content") } as FileReader,
      processor: { process: vi.fn().mockResolvedValue(mockEntities) } as DocumentProcessor,
      guessMimeType: vi.fn().mockReturnValue("application/pdf"),
    };
  }

  it("正しいパスでファイルを読み取る", async () => {
    const { fileReader, processor, guessMimeType } = createMocks();
    await processDocument(baseConfig, fileReader, processor, guessMimeType);

    expect(fileReader.readAsBase64).toHaveBeenCalledWith("/app/input/receipt.pdf");
  });

  it("mimeTypeOverrideがない場合、guessMimeTypeを使う", async () => {
    const { fileReader, processor, guessMimeType } = createMocks();
    await processDocument(baseConfig, fileReader, processor, guessMimeType);

    expect(guessMimeType).toHaveBeenCalledWith("/app/input/receipt.pdf");
  });

  it("mimeTypeOverrideがある場合、guessMimeTypeを使わない", async () => {
    const configWithOverride = { ...baseConfig, mimeTypeOverride: "image/png" };
    const { fileReader, processor, guessMimeType } = createMocks();
    await processDocument(configWithOverride, fileReader, processor, guessMimeType);

    expect(guessMimeType).not.toHaveBeenCalled();
  });

  it("正しいprocessor名を構築してprocessを呼ぶ", async () => {
    const { fileReader, processor, guessMimeType } = createMocks();
    await processDocument(baseConfig, fileReader, processor, guessMimeType);

    expect(processor.process).toHaveBeenCalledWith({
      name: "projects/my-project/locations/us/processors/proc-123",
      content: "base64content",
      mimeType: "application/pdf",
    });
  });

  it("entitiesを返す", async () => {
    const { fileReader, processor, guessMimeType } = createMocks();
    const result = await processDocument(baseConfig, fileReader, processor, guessMimeType);

    expect(result).toEqual(mockEntities);
  });
});
