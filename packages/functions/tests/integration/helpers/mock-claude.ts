import { vi } from "vitest";

export const mockMessagesCreate = vi.fn();

// 既定トランスポート（api）の SDK をモックする（ADR-0013）。
vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class {
      messages = { create: mockMessagesCreate };
    },
  };
});
