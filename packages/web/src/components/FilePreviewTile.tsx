import { useState } from "react";
import { useObjectUrl } from "../hooks/useObjectUrl";
import { isImageMimeType } from "../utils/file";
import { ImagePreviewDialog } from "./ImagePreviewDialog";
import styles from "./FilePreviewTile.module.css";

interface FilePreviewTileProps {
  file: File;
}

/**
 * 選択済みファイル 1 件のサムネイル。
 * 画像はクリックで拡大モーダルを開ける。PDF はブラウザ単体でサムネイル化できないため、
 * アイコンによる代替タイルを表示する。
 */
export function FilePreviewTile({ file }: FilePreviewTileProps) {
  const isImage = isImageMimeType(file.type);
  const url = useObjectUrl(isImage ? file : null);
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <>
      {isImage ? (
        <button
          type="button"
          className={styles.thumbnailButton}
          onClick={() => setIsZoomed(true)}
          disabled={!url}
          aria-label={`${file.name} を拡大表示`}
        >
          {url && (
            /* 20 件の高解像度写真を同時にデコードしないよう、画面外のサムネイルは遅延読み込みする */
            <img className={styles.thumbnail} src={url} alt={file.name} loading="lazy" />
          )}
        </button>
      ) : (
        <div className={styles.documentTile} aria-hidden="true">
          <span className={styles.documentIcon}>📄</span>
          <span className={styles.documentLabel}>PDF</span>
        </div>
      )}
      <p className={styles.fileName}>{file.name}</p>
      {isZoomed && url && (
        <ImagePreviewDialog src={url} fileName={file.name} onClose={() => setIsZoomed(false)} />
      )}
    </>
  );
}
