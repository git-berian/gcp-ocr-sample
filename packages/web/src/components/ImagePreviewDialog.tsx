import { useEffect, useRef, type MouseEvent, type SyntheticEvent } from "react";
import styles from "./ImagePreviewDialog.module.css";

interface ImagePreviewDialogProps {
  src: string;
  fileName: string;
  onClose: () => void;
}

/**
 * 選択した画像を拡大表示するモーダル。
 *
 * ネイティブ `<dialog>` の `showModal()` を使うことで、Esc での閉じる操作・
 * フォーカストラップ・背面の inert 化をブラウザ標準の挙動として得る。
 * 開閉は React の state を単一の情報源とするため、Esc（cancel）は preventDefault し、
 * 実際の close は親がアンマウントしたときの cleanup でのみ行う。
 */
export function ImagePreviewDialog({ src, fileName, onClose }: ImagePreviewDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    dialog.showModal();
    return () => dialog.close();
  }, []);

  const handleCancel = (e: SyntheticEvent<HTMLDialogElement>) => {
    e.preventDefault();
    onClose();
  };

  // backdrop（::backdrop 領域）のクリックは dialog 要素自身が受け取る。
  // click は mousedown と mouseup の共通祖先に発火するため、画像上で押して backdrop で
  // 離した場合（画像のドラッグ・キャプションの選択）にも target が dialog になってしまう。
  // 押した位置も backdrop だったときだけ閉じる。
  const pressedBackdropRef = useRef(false);

  const handleMouseDown = (e: MouseEvent<HTMLDialogElement>) => {
    pressedBackdropRef.current = e.target === dialogRef.current;
  };

  const handleClick = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current && pressedBackdropRef.current) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-label={`${fileName} の拡大表示`}
      onCancel={handleCancel}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <div className={styles.content}>
        <button type="button" className={styles.closeButton} aria-label="閉じる" onClick={onClose}>
          ×
        </button>
        <img className={styles.image} src={src} alt={fileName} />
        <p className={styles.caption}>{fileName}</p>
      </div>
    </dialog>
  );
}
