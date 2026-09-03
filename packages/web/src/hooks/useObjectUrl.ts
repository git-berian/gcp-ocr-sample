import { useEffect, useState } from "react";

/**
 * ファイルのプレビュー用 blob URL を生成する。`file` が null のときは URL を作らない。
 *
 * URL の生成は副作用のため `useEffect` で行う。そのため `file` が変わった直後の 1 レンダーは
 * `null` を返し、生成後の再レンダーで URL が入る。
 * `file` の変更時とアンマウント時に、生成した URL を必ず revoke する。
 *
 * 依存を File 単体にしているのは、配列を受け取ると呼び出し側が毎レンダー新しい配列を
 * 渡した場合に「生成 → 再レンダー → 生成」の無限ループになるため。
 */
export function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }

    const created = URL.createObjectURL(file);
    setUrl(created);

    return () => {
      URL.revokeObjectURL(created);
      setUrl(null);
    };
  }, [file]);

  return url;
}
