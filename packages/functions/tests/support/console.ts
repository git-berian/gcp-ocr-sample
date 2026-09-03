// このディレクトリ（tests/support/）は unit・integration の双方から使う共通のテスト補助を置く。
// integration 専用のモック・フィクスチャは tests/integration/helpers/ にあるため、
// import パスを見ただけでどちらの資産か分かるよう名前を分けている。

import { onTestFinished, vi } from "vitest";

/**
 * `console.error` をスパイに差し替え、テスト終了時に自動で復元する。
 *
 * ハンドラは抽出失敗時に `console.error("extractReceipt 失敗:", e)` でログを出してから
 * エラーを返す。失敗パスのテストはこれを意図的に踏むため、そのままだと Vitest の
 * stderr セクションにスタックトレースが並び、パスしていても失敗と誤読される。
 *
 * 復元を `onTestFinished` で行うのは、結合テストの `afterEach` が `vi.unstubAllEnvs()` だけで
 * `vi.restoreAllMocks()` を呼んでおらず、呼び出し側に後始末を委ねるとスパイが
 * 後続のテストへ漏れるため。
 *
 * 戻り値のスパイで、ログが期待どおり出ていることも検証できる。
 */
export function spyOnConsoleError() {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  onTestFinished(() => spy.mockRestore());
  return spy;
}

/** ハンドラが抽出失敗時に出すログの接頭辞 */
export const EXTRACT_FAILURE_LOG_PREFIX = "extractReceipt 失敗:";
