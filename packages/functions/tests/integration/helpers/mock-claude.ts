import { vi } from "vitest";

export const mockMessagesCreate = vi.fn();

vi.mock("@anthropic-ai/vertex-sdk", () => {
  return {
    AnthropicVertex: class {
      messages = { create: mockMessagesCreate };
    },
  };
});
