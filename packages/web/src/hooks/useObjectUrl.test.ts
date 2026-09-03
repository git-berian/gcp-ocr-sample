import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useObjectUrl } from "./useObjectUrl";

const png = (name: string) => new File(["x"], name, { type: "image/png" });

describe("useObjectUrl", () => {
  let createSpy: ReturnType<typeof vi.spyOn>;
  let revokeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    createSpy = vi.spyOn(URL, "createObjectURL");
    revokeSpy = vi.spyOn(URL, "revokeObjectURL");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates an object URL for the given file", () => {
    const file = png("a.png");
    const { result } = renderHook(() => useObjectUrl(file));

    expect(result.current).toMatch(/^blob:/);
    expect(createSpy).toHaveBeenCalledExactlyOnceWith(file);
  });

  it("returns null without creating a URL when the file is null", () => {
    const { result } = renderHook(() => useObjectUrl(null));

    expect(result.current).toBeNull();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("revokes the previous URL and creates a new one when the file changes", () => {
    const { result, rerender } = renderHook(({ file }) => useObjectUrl(file), {
      initialProps: { file: png("a.png") },
    });
    const firstUrl = result.current;

    rerender({ file: png("b.png") });

    expect(revokeSpy).toHaveBeenCalledExactlyOnceWith(firstUrl);
    expect(result.current).toMatch(/^blob:/);
    expect(result.current).not.toBe(firstUrl);
  });

  it("revokes the URL on unmount", () => {
    const file = png("a.png");
    const { result, unmount } = renderHook(() => useObjectUrl(file));
    const url = result.current;

    unmount();

    expect(revokeSpy).toHaveBeenCalledExactlyOnceWith(url);
  });

  it("does not recreate the URL when re-rendered with the same file", () => {
    const file = png("a.png");
    const { result, rerender } = renderHook(({ file }) => useObjectUrl(file), {
      initialProps: { file },
    });
    const firstUrl = result.current;

    rerender({ file });

    expect(createSpy).toHaveBeenCalledOnce();
    expect(revokeSpy).not.toHaveBeenCalled();
    expect(result.current).toBe(firstUrl);
  });

  it("revokes the URL when the file becomes null", () => {
    const { result, rerender } = renderHook(({ file }) => useObjectUrl(file), {
      initialProps: { file: png("a.png") as File | null },
    });
    const url = result.current;

    rerender({ file: null });

    expect(revokeSpy).toHaveBeenCalledExactlyOnceWith(url);
    expect(result.current).toBeNull();
  });
});
