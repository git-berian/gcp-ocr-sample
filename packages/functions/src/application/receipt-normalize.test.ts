import { describe, it, expect } from "vitest";
import {
  toStringOrNull,
  toNumberOrNull,
  toIsoDateOrNull,
  toRegistrationNumberOrNull,
  dateFromParts,
  moneyToNumber,
} from "./receipt-normalize.js";

describe("toStringOrNull", () => {
  it("空でない文字列はそのまま、空文字・非文字列は null", () => {
    expect(toStringOrNull("abc")).toBe("abc");
    expect(toStringOrNull("")).toBeNull();
    expect(toStringOrNull(null)).toBeNull();
    expect(toStringOrNull(123)).toBeNull();
  });
});

describe("toNumberOrNull", () => {
  it("数値はそのまま、非有限は null", () => {
    expect(toNumberOrNull(1234)).toBe(1234);
    expect(toNumberOrNull(0)).toBe(0);
    expect(toNumberOrNull(Number.NaN)).toBeNull();
  });

  it("通貨記号・カンマ・全角数字をコアースする", () => {
    expect(toNumberOrNull("¥4,800")).toBe(4800);
    expect(toNumberOrNull("1,234")).toBe(1234);
    expect(toNumberOrNull("１２３")).toBe(123);
  });

  it("読めない値は null", () => {
    expect(toNumberOrNull("不明")).toBeNull();
    expect(toNumberOrNull("")).toBeNull();
    expect(toNumberOrNull(null)).toBeNull();
  });

  it("全角小数点・全角マイナスを保持してコアースする", () => {
    expect(toNumberOrNull("１，２３４．５")).toBe(1234.5);
    expect(toNumberOrNull("－５００")).toBe(-500);
  });
});

describe("toIsoDateOrNull", () => {
  it("YYYY-MM-DD 形式のみ受け入れる", () => {
    expect(toIsoDateOrNull("2026-05-16")).toBe("2026-05-16");
  });

  it("別形式・非文字列は null（契約担保）", () => {
    expect(toIsoDateOrNull("2026/05/16")).toBeNull();
    expect(toIsoDateOrNull("令和6年3月15日")).toBeNull();
    expect(toIsoDateOrNull("")).toBeNull();
    expect(toIsoDateOrNull(null)).toBeNull();
  });

  it("書式は合っていても実在しない日付は null", () => {
    expect(toIsoDateOrNull("2026-02-31")).toBeNull();
    expect(toIsoDateOrNull("2026-13-01")).toBeNull();
  });
});

describe("toRegistrationNumberOrNull", () => {
  it("T+数字13桁のみ受け入れ、空白は除去する", () => {
    expect(toRegistrationNumberOrNull("T1234567890123")).toBe("T1234567890123");
    expect(toRegistrationNumberOrNull("T 1234567890123")).toBe("T1234567890123");
  });

  it("桁不足・別形式・非文字列は null", () => {
    expect(toRegistrationNumberOrNull("T123")).toBeNull();
    expect(toRegistrationNumberOrNull("1234567890123")).toBeNull();
    expect(toRegistrationNumberOrNull("登録番号")).toBeNull();
    expect(toRegistrationNumberOrNull("")).toBeNull();
    expect(toRegistrationNumberOrNull(null)).toBeNull();
  });
});

describe("dateFromParts", () => {
  it("year/month/day を YYYY-MM-DD に整形（ゼロ埋め）", () => {
    expect(dateFromParts({ year: 2026, month: 5, day: 16 })).toBe("2026-05-16");
    expect(dateFromParts({ year: 2026, month: 12, day: 3 })).toBe("2026-12-03");
  });

  it("欠損・null・実在しない日付は null", () => {
    expect(dateFromParts({ year: 2026, month: 5 })).toBeNull();
    expect(dateFromParts(null)).toBeNull();
    expect(dateFromParts(undefined)).toBeNull();
    expect(dateFromParts({ year: 2026, month: 13, day: 40 })).toBeNull();
    expect(dateFromParts({ year: 2026, month: 2, day: 31 })).toBeNull();
  });
});

describe("moneyToNumber", () => {
  it("units/nanos を数値化（string units 含む）", () => {
    expect(moneyToNumber({ units: 4800, nanos: 0 })).toBe(4800);
    expect(moneyToNumber({ units: "436" })).toBe(436);
    expect(moneyToNumber({ units: 1, nanos: 500000000 })).toBe(1.5);
  });

  it("null や不正値、units/nanos とも欠落は null", () => {
    expect(moneyToNumber(null)).toBeNull();
    expect(moneyToNumber({ units: "abc" })).toBeNull();
    expect(moneyToNumber({})).toBeNull();
  });
});
