/**
 * Storybook / VRT 用のサンプル画像。
 * スクリーンショットを決定的にするため、外部アセットではなくインラインの base64 PNG を使う。
 * 90x120px の領収書を模した図形（見出し・明細行・合計）。
 */
export const RECEIPT_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAFoAAAB4CAIAAAD9rnJoAAAAyElEQVR42u3csQ0AIAgEQAZzOie20N7ODUxAj/wEF0j8xlhzyEkgwIEDBw4cOHDgSMjRag4OHDhw4MBRg8O7A4fgwIEDBw4cOHDgwFGGo9cc2+FYcODAgQMHDhw4cOgsOotjwYFDcODAgQMHDhw6i87iWHDgwIEDBw4cOHDg0FlsBw4cOHDgwIEDBw4cOovO4lhw4MCBAwcOCjhw4MCBAwcOHD9x5Py4EwcOHDhw4MCB43kOr1IcOHDgwIEDBw7BgQMHDhw4LmUDfTYQ7OyPmHUAAAAASUVORK5CYII=";

export function base64ToFile(base64: string, fileName: string, mimeType: string): File {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new File([bytes], fileName, { type: mimeType });
}

export const RECEIPT_PNG_DATA_URL = `data:image/png;base64,${RECEIPT_PNG_BASE64}`;
