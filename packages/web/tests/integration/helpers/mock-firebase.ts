import { vi } from "vitest";

export const mockCallable = vi.fn();

vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(),
}));

vi.mock("firebase/functions", () => ({
  getFunctions: vi.fn(),
  connectFunctionsEmulator: vi.fn(),
  httpsCallable: vi.fn(() => mockCallable),
}));
