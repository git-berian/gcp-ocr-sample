import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "fs";
import { createFileReader } from "./file-reader.js";

vi.mock("fs");

describe("createFileReader", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ファイルをBase64文字列として読み取る", () => {
    const fakeBuffer = Buffer.from("hello");
    vi.mocked(fs.readFileSync).mockReturnValue(fakeBuffer);

    const reader = createFileReader();
    const result = reader.readAsBase64("/app/input/receipt.pdf");

    expect(fs.readFileSync).toHaveBeenCalledWith("/app/input/receipt.pdf");
    expect(result).toBe(fakeBuffer.toString("base64"));
  });

  it("ファイルが存在しない場合、例外を投げる", () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error("ENOENT: no such file");
    });

    const reader = createFileReader();
    expect(() => reader.readAsBase64("/app/input/missing.pdf")).toThrow("ENOENT");
  });
});
