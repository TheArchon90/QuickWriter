import { describe, it, expect } from "vitest";
import {
  CONTRACTION_MAP,
  ABBREVIATIONS,
  expandContraction,
  shouldCapitalizeAfter,
  isStandaloneI,
} from "../textProcessing";

describe("expandContraction", () => {
  it("expands lowercase contractions", () => {
    expect(expandContraction("dont")).toBe("don't");
    expect(expandContraction("im")).toBe("I'm");
    expect(expandContraction("cant")).toBe("can't");
    expect(expandContraction("youre")).toBe("you're");
  });

  it("preserves capitalization of first letter", () => {
    expect(expandContraction("Dont")).toBe("Don't");
    expect(expandContraction("Im")).toBe("I'm");
    expect(expandContraction("Cant")).toBe("Can't");
  });

  it("returns null for non-contractions", () => {
    expect(expandContraction("hello")).toBeNull();
    expect(expandContraction("the")).toBeNull();
  });
});

describe("shouldCapitalizeAfter", () => {
  it("returns true after sentence-ending punctuation + space", () => {
    expect(shouldCapitalizeAfter("Hello. ")).toBe(true);
    expect(shouldCapitalizeAfter("Done! ")).toBe(true);
    expect(shouldCapitalizeAfter("Really? ")).toBe(true);
  });

  it("returns false after abbreviations", () => {
    expect(shouldCapitalizeAfter("Dr. ")).toBe(false);
    expect(shouldCapitalizeAfter("Mr. ")).toBe(false);
    expect(shouldCapitalizeAfter("e.g. ")).toBe(false);
  });

  it("returns true at start of text", () => {
    expect(shouldCapitalizeAfter("")).toBe(true);
  });

  it("returns true after newline", () => {
    expect(shouldCapitalizeAfter("First line.\n")).toBe(true);
  });
});

describe("isStandaloneI", () => {
  it("detects standalone i between spaces", () => {
    expect(isStandaloneI("and i ", 4)).toBe(true);
  });

  it("rejects i inside words", () => {
    expect(isStandaloneI("writing ", 4)).toBe(false);
    expect(isStandaloneI("in ", 0)).toBe(false);
  });

  it("detects i at start of text", () => {
    expect(isStandaloneI("i ", 0)).toBe(true);
  });
});
