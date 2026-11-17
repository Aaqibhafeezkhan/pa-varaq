import { describe, expect, it } from "vitest";
import {
  fuzzGeohash,
  isValidIsbn,
  isValidNationalId,
  nationalIdCheckDigit,
  normalizeContact,
  normalizeIranMobile,
  normalizeJalaliDate,
  normalizePersian,
} from "./normalize";

describe("normalizePersian", () => {
  it("unifies Arabic and Persian letter variants and digits", () => {
    expect(normalizePersian("كتاب يك ۱۲۳")).toBe("کتاب یک 123");
  });
  it("treats ZWNJ as a space", () => {
    expect(normalizePersian("می‌خواهم")).toBe("می خواهم");
  });
});

describe("isValidIsbn", () => {
  it("accepts valid ISBN-13 and ISBN-10 values", () => {
    expect(isValidIsbn("9780306406157")).toBe(true);
    expect(isValidIsbn("978-0-306-40615-7")).toBe(true);
    expect(isValidIsbn("0306406152")).toBe(true);
    expect(isValidIsbn("0-9752298-0-X")).toBe(true);
  });

  it("rejects invalid ISBN-13 and ISBN-10 check digits", () => {
    expect(isValidIsbn("9780306406158")).toBe(false);
    expect(isValidIsbn("0306406153")).toBe(false);
  });

  it("rejects unsupported lengths and malformed ISBN values", () => {
    expect(isValidIsbn("978030640615")).toBe(false);
    expect(isValidIsbn("97803064061570")).toBe(false);
    expect(isValidIsbn("978-0-306-4061A-7")).toBe(false);
  });
});

describe("normalizeContact", () => {
  it("normalizes Iranian mobile numbers and emails", () => {
    expect(normalizeContact("۰۹۱۲ ۳۴۵ ۶۷۸۹")).toBe("+989123456789");
    expect(normalizeContact(" Foo@Example.COM ")).toBe("foo@example.com");
  });
});

describe("fuzzGeohash", () => {
  it("truncates to neighborhood precision", () => {
    expect(fuzzGeohash("sv9jk3x7q2", 5)).toBe("sv9jk");
  });
});

describe("isValidNationalId", () => {
  it("accepts a valid national code", () => {
    expect(isValidNationalId("0013542419")).toBe(true);
    expect(nationalIdCheckDigit("001354241")).toBe(9);
  });

  it("rejects an incorrect check digit", () => {
    expect(isValidNationalId("0013542418")).toBe(false);
  });

  it("rejects repeated digits and incorrect lengths", () => {
    expect(isValidNationalId("1111111111")).toBe(false);
    expect(isValidNationalId("0000000000")).toBe(false);
    expect(isValidNationalId("123456789")).toBe(false);
    expect(isValidNationalId("00135424199")).toBe(false);
  });

  it("accepts Persian digits", () => {
    expect(isValidNationalId("۰۰۱۳۵۴۲۴۱۹")).toBe(true);
  });
});

describe("normalizeIranMobile", () => {
  it("accepts local numbers", () => {
    expect(normalizeIranMobile("09123456789")).toBe("09123456789");
  });

  it("normalizes international plus and 00 prefixes", () => {
    expect(normalizeIranMobile("+989123456789")).toBe("09123456789");
    expect(normalizeIranMobile("+98 912 345 6789")).toBe("09123456789");
    expect(normalizeIranMobile("00989123456789")).toBe("09123456789");
  });

  it("accepts Persian digits", () => {
    expect(normalizeIranMobile("۰۹۱۲۳۴۵۶۷۸۹")).toBe("09123456789");
  });

  it("rejects invalid prefixes and lengths", () => {
    expect(normalizeIranMobile("08123456789")).toBeNull();
    expect(normalizeIranMobile("+971501234567")).toBeNull();
    expect(normalizeIranMobile("0912345678")).toBeNull();
    expect(normalizeIranMobile("091234567890")).toBeNull();
  });
});

describe("normalizeJalaliDate", () => {
  it("normalizes YYYY/MM/DD dates and Persian digits", () => {
    expect(normalizeJalaliDate("1378/4/15")).toBe("1378/04/15");
    expect(normalizeJalaliDate("۱۳۷۸/۴/۱۵")).toBe("1378/04/15");
  });

  it("accepts leap-year Esfand 30 and rejects it in a common year", () => {
    expect(normalizeJalaliDate("1399/12/30")).toBe("1399/12/30");
    expect(normalizeJalaliDate("1400/12/30")).toBeNull();
  });

  it("validates the six 31-day months", () => {
    expect(normalizeJalaliDate("1400/01/31")).toBe("1400/01/31");
    expect(normalizeJalaliDate("1400/06/31")).toBe("1400/06/31");
    expect(normalizeJalaliDate("1400/07/31")).toBeNull();
  });

  it("validates 30-day months and impossible days", () => {
    expect(normalizeJalaliDate("1400/07/30")).toBe("1400/07/30");
    expect(normalizeJalaliDate("1400/11/30")).toBe("1400/11/30");
    expect(normalizeJalaliDate("1400/07/32")).toBeNull();
    expect(normalizeJalaliDate("1400/02/32")).toBeNull();
  });

  it("rejects invalid months, days and years", () => {
    expect(normalizeJalaliDate("1378/13/01")).toBeNull();
    expect(normalizeJalaliDate("1378/00/01")).toBeNull();
    expect(normalizeJalaliDate("1378/01/00")).toBeNull();
    expect(normalizeJalaliDate("1279/01/01")).toBeNull();
    expect(normalizeJalaliDate("1421/01/01")).toBeNull();
  });
});
