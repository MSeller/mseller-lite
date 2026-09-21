import { describe, expect, it } from "@jest/globals";

import { extractInvitationCode, normalizeInvitationCode } from "../b2b";

describe("extractInvitationCode", () => {
  it("takes the code from the invitation URL the QR encodes", () => {
    expect(extractInvitationCode("https://mseller.app/i/HCGP5VTW")).toBe("HCGP5VTW");
  });

  it("still finds it after the site has redirected to a language", () => {
    expect(extractInvitationCode("https://mseller.app/es/i/HCGP5VTW")).toBe("HCGP5VTW");
  });

  it("ignores the query string and the fragment", () => {
    expect(extractInvitationCode("https://mseller.app/i/HCGP5VTW?utm_source=qr#top")).toBe(
      "HCGP5VTW"
    );
  });

  it("undoes the escaping the server applies to the code", () => {
    expect(extractInvitationCode("https://mseller.app/i/%48%43GP5VTW")).toBe("HCGP5VTW");
  });

  it("survives a damaged escape instead of throwing", () => {
    // A half-read QR can leave a truncated %xx; the alphabet filter drops the remains.
    expect(() => extractInvitationCode("https://mseller.app/i/HCGP5VT%")).not.toThrow();
  });

  it("accepts a bare code, in case one is ever printed on its own", () => {
    expect(extractInvitationCode("  hcgp5vtw ")).toBe("HCGP5VTW");
  });

  it("does not mistake a bare code containing a slash for a URL", () => {
    // Matching on "/" alone would keep only the second half.
    expect(extractInvitationCode("HCGP/5VTW")).toBe("HCGP5VTW");
  });

  it("returns nothing for a QR that belongs to some other app", () => {
    // The guard that matters: normalising this URL directly would distil host and path
    // into eight plausible characters and submit a code nobody was ever given.
    expect(extractInvitationCode("https://example.com/promo")).not.toHaveLength(8);
  });

  it("returns an empty string for an empty read", () => {
    expect(extractInvitationCode("   ")).toBe("");
  });
});

describe("normalizeInvitationCode", () => {
  it("drops the punctuation people add while reading a code aloud", () => {
    expect(normalizeInvitationCode("ab 34-cd7k")).toBe("AB34CD7K");
  });

  it("caps a longer paste at the code length", () => {
    expect(normalizeInvitationCode("ABCDEFGHJK")).toHaveLength(8);
  });

  it("drops the characters the alphabet excludes", () => {
    // No I, O, 0 or 1: they are the pairs misread off a slip of paper.
    expect(normalizeInvitationCode("IO01ABCD")).toBe("ABCD");
  });
});
