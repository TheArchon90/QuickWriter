import { describe, it, expect } from "vitest";
import { parseKeybind, formatKeybind, checkConflicts } from "../keybindParser";

describe("parseKeybind", () => {
  it("parses simple keys", () => {
    expect(parseKeybind("n")).toBe("n");
    expect(parseKeybind("Escape")).toBe("Escape");
  });

  it("parses modifier combos to CodeMirror format", () => {
    expect(parseKeybind("Ctrl+S")).toBe("Mod-s");
    expect(parseKeybind("Ctrl+Shift+S")).toBe("Mod-Shift-s");
    expect(parseKeybind("Ctrl+J")).toBe("Mod-j");
  });
});

describe("formatKeybind", () => {
  it("formats CodeMirror keys to display format", () => {
    expect(formatKeybind("Mod-s")).toBe("Ctrl+S");
    expect(formatKeybind("Mod-Shift-s")).toBe("Ctrl+Shift+S");
    expect(formatKeybind("n")).toBe("N");
    expect(formatKeybind("Escape")).toBe("Esc");
  });
});

describe("checkConflicts", () => {
  it("detects duplicate keybinds within a context", () => {
    const shortcuts = {
      general: { save: "Ctrl+S", other: "Ctrl+S" },
      navigation: {},
      insert: {},
    };
    const conflicts = checkConflicts(shortcuts);
    expect(conflicts.length).toBeGreaterThan(0);
  });

  it("returns empty for no conflicts", () => {
    const shortcuts = {
      general: { save: "Ctrl+S" },
      navigation: { next: "n" },
      insert: { exit: "Escape" },
    };
    const conflicts = checkConflicts(shortcuts);
    expect(conflicts).toHaveLength(0);
  });
});
