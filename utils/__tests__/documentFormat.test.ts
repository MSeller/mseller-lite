import { describe, expect, it } from "@jest/globals";

import { parseNumericInput, parseStrictNumericInput, productDisplayName } from "../documentFormat";

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

// Same cases as mobile-seller MSellerLogicTests/ProductDisplayNameTests.swift: both apps must
// show a product under the same name.
describe("productDisplayName", () => {
  it("turns capitals into title case", () => {
    expect(productDisplayName("CARIDOM ALCAPARRADO 12/10")).toBe("Caridom Alcaparrado 12/10");
  });

  it("lowercases a unit that follows a size", () => {
    expect(productDisplayName("CARIDOM COARSE CORNMEAL 6/4 LB")).toBe("Caridom Coarse Cornmeal 6/4 lb");
    expect(productDisplayName("LECHE 1 L")).toBe("Leche 1 l");
  });

  it("capitalizes a unit word that does not follow a size", () => {
    expect(productDisplayName("UN PAQUETE")).toBe("Un Paquete");
  });

  it("keeps size tokens as typed", () => {
    expect(productDisplayName("REFRESCO 12OZ")).toBe("Refresco 12OZ");
  });

  it("preserves accents and spacing", () => {
    expect(productDisplayName("JAMÓN  ÁREA")).toBe("Jamón  Área");
    expect(productDisplayName("")).toBe("");
  });
});
