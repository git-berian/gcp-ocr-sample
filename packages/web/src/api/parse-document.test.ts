import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseDocument } from "./parse-document";
import * as client from "./client";

vi.mock("./client");

describe("parseDocument", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls post with /parse and the request body", async () => {
    const mockResponse = {
      entities: [{ type: "total", mentionText: "1000", confidence: 0.95 }],
    };
    vi.mocked(client.post).mockResolvedValue(mockResponse);

    const result = await parseDocument({
      content: "base64data",
      mimeType: "image/png",
    });

    expect(client.post).toHaveBeenCalledWith("/parse", {
      content: "base64data",
      mimeType: "image/png",
    });
    expect(result).toEqual(mockResponse);
  });
});
