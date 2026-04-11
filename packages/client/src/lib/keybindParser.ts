export function parseKeybind(keybind: string): string {
  if (!keybind.includes("+")) return keybind;
  const parts = keybind.split("+");
  const modifiers: string[] = [];
  let key = parts[parts.length - 1].toLowerCase();
  for (let i = 0; i < parts.length - 1; i++) {
    const mod = parts[i].trim();
    if (mod === "Ctrl" || mod === "Cmd") modifiers.push("Mod");
    else if (mod === "Shift") modifiers.push("Shift");
    else if (mod === "Alt") modifiers.push("Alt");
  }
  return [...modifiers, key].join("-");
}

export function formatKeybind(cmKey: string): string {
  if (!cmKey.includes("-")) {
    if (cmKey === "Escape") return "Esc";
    return cmKey.length === 1 ? cmKey.toUpperCase() : cmKey;
  }
  const parts = cmKey.split("-");
  const formatted = parts.map((p, i) => {
    if (i === parts.length - 1) return p.toUpperCase();
    if (p === "Mod") return "Ctrl";
    return p;
  });
  return formatted.join("+");
}

export interface Conflict {
  key: string;
  action1: string;
  action2: string;
  context: string;
}

export function checkConflicts(
  shortcuts: Record<string, Record<string, string>>
): Conflict[] {
  const conflicts: Conflict[] = [];
  for (const [context, bindings] of Object.entries(shortcuts)) {
    const seen = new Map<string, string>();
    for (const [action, key] of Object.entries(bindings)) {
      const normalized = key.toLowerCase();
      if (seen.has(normalized)) {
        conflicts.push({
          key, action1: seen.get(normalized)!, action2: action, context,
        });
      }
      seen.set(normalized, action);
    }
  }
  if (shortcuts.general) {
    for (const [gAction, gKey] of Object.entries(shortcuts.general)) {
      const gNorm = gKey.toLowerCase();
      for (const ctx of ["navigation", "insert"]) {
        if (!shortcuts[ctx]) continue;
        for (const [cAction, cKey] of Object.entries(shortcuts[ctx])) {
          if (cKey.toLowerCase() === gNorm) {
            conflicts.push({
              key: gKey, action1: gAction, action2: cAction,
              context: `general ↔ ${ctx}`,
            });
          }
        }
      }
    }
  }
  return conflicts;
}
