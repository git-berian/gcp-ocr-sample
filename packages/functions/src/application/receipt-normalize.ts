/**
 * 領収書抽出値の正規化ヘルパー（Document AI / Gemini 双方のアダプタで共有）。
 * 外部依存を持たない純粋関数のみ。
 */

/** 空文字を null に正規化する。文字列以外は null。 */
export function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * 金額文字列・数値を number に正規化する。
 * 通貨記号・カンマ・全角数字を吸収し、読めない値は null。
 */
export function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const normalized = value
      .replace(/[０-９]/g, (d) => "０１２３４５６７８９".indexOf(d).toString())
      .replace(/．/g, ".")
      .replace(/－/g, "-")
      .replace(/[^0-9.-]/g, "");
    if (normalized === "" || normalized === "-" || normalized === ".") {
      return null;
    }
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** 実在するカレンダー日付か（月・日の範囲と月末日を検証）。 */
function isRealYmd(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/**
 * YYYY-MM-DD 形式かつ実在する日付の文字列のみ受け入れ、それ以外は null。
 * 正準モデルの receiptDate 契約（YYYY-MM-DD）を境界で担保する。
 */
export function toIsoDateOrNull(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  return isRealYmd(year, month, day) ? value : null;
}

/**
 * Document AI の normalizedValue.dateValue（{year, month, day}）を YYYY-MM-DD に整形する。
 * 年月日が揃わない、または実在しない日付の場合は null。
 */
export function dateFromParts(
  date: { year?: number | null; month?: number | null; day?: number | null } | null | undefined,
): string | null {
  if (!date) return null;
  const { year, month, day } = date;
  if (!year || !month || !day || !isRealYmd(year, month, day)) return null;
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/**
 * インボイス登録番号を正規化する。空白除去後「T + 数字13桁」に一致すればその値、
 * それ以外は null（契約: T+13桁でなければ null）。
 */
export function toRegistrationNumberOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s/g, "");
  return /^T\d{13}$/.test(normalized) ? normalized : null;
}

/**
 * Document AI の normalizedValue.moneyValue（{units, nanos}）を number に変換する。
 * units は string | number | Long 相当が来うるため数値化する。
 */
export function moneyToNumber(
  money: { units?: number | string | null; nanos?: number | null } | null | undefined,
): number | null {
  if (!money) return null;
  if (money.units == null && money.nanos == null) return null;
  const unitsNum = money.units == null ? 0 : Number(money.units);
  const nanosNum = money.nanos == null ? 0 : Number(money.nanos);
  if (!Number.isFinite(unitsNum) || !Number.isFinite(nanosNum)) return null;
  const value = unitsNum + nanosNum / 1e9;
  return Number.isFinite(value) ? value : null;
}
