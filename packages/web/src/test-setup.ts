import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom は URL.createObjectURL / revokeObjectURL を実装していないため、
// blob URL を使うコンポーネント（FilePreviewList 等）向けに最小限のスタブを用意する。
// 後段の <dialog> ポリフィルと違い無条件に差し替えるのは、テストが URL の値そのものを
// 検証するため、jsdom 側の実装状況で結果が変わらないようにするため。
let objectUrlSeq = 0;
URL.createObjectURL = () => `blob:mock/${++objectUrlSeq}`;
URL.revokeObjectURL = () => {};

// jsdom は <dialog> の showModal / close を実装していないため、open 属性の付け外しだけを模した
// ポリフィルを入れる（フォーカストラップや Esc の挙動はブラウザ依存のため VRT・手動確認で担保する）
if (!HTMLDialogElement.prototype.showModal) {
  const open = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.show = open;
  HTMLDialogElement.prototype.showModal = open;
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}

afterEach(() => {
  cleanup();
});
