import { vi } from "vitest";

export const mockProcessDocument = vi.fn();

vi.mock("@google-cloud/documentai", () => {
  return {
    DocumentProcessorServiceClient: class {
      processDocument = mockProcessDocument;
    },
  };
});
