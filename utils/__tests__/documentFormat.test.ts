import { describe, expect, it } from "@jest/globals";

import { parseNumericInput, parseStrictNumericInput } from "../documentFormat";

describe("parseNumericInput", () => {
  it("reads plain and comma decimals and treats empty as 0", () => {
    expect(parseNumericInput("12,5")).toBe(12.5);
    expect(parseNumericInput(" 1 000 ")).toBe(1000);
    expect(parseNumericInput("")).toBe(0);
  });

  it("stays lenient: a trailing typo keeps the leading number, garbage is 0", () => {
    expect(parseNumericInput("12abc")).toBe(12);
    expect(parseNumericInput("abc")).toBe(0);
  });
});

describe("parseStrictNumericInput", () => {
  it("reads plain and comma decimals", () => {
    expect(parseStrictNumericInput("12")).toBe(12);
    expect(parseStrictNumericInput("12.5")).toBe(12.5);
    expect(parseStrictNumericInput("12,5")).toBe(12.5);
    expect(parseStrictNumericInput(" 1 000 ")).toBe(1000);
    expect(parseStrictNumericInput("-3")).toBe(-3);
  });

  it("treats an empty field as 0", () => {
    expect(parseStrictNumericInput("")).toBe(0);
    expect(parseStrictNumericInput("  ")).toBe(0);
  });

  it("rejects anything that is not entirely a number", () => {
    expect(parseStrictNumericInput("12abc")).toBeNull();
    expect(parseStrictNumericInput("1.2.3")).toBeNull();
    expect(parseStrictNumericInput("abc")).toBeNull();
  });
});
