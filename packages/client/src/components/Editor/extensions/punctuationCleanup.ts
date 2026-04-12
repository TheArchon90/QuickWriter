import { ViewPlugin, ViewUpdate } from "@codemirror/view";

/**
 * Real-time punctuation cleanup.
 *
 * Fires after every user-initiated change (type, delete, paste) and scans the
 * area around the edit for common punctuation artifacts: double spaces, spaces
 * before punctuation, orphaned commas after sentence-end, and double periods.
 *
 * Generates precise individual changes (not a bulk replace) so the cursor
 * stays in place. The cleanup dispatch carries no user-event annotation, so
 * it won't retrigger this plugin, autoCapitalize, or autoPunctuate.
 */

interface Fix {
  from: number;
  to: number;
  insert: string;
}

/**
 * Collect all fixes for the text in [offset, offset + text.length).
 *
 * @param alwaysRules  - if true, run rules that are safe during typing
 * @param deleteRules  - if true, also run rules that should only fire on delete/paste
 */
function collectFixes(
  text: string,
  offset: number,
  deleteRules: boolean,
): Fix[] {
  const fixes: Fix[] = [];

  // ── Always-active rules (safe during typing) ──

  // 1. Collapse double+ spaces to single (not at line start / doc start).
  //    Lookbehind requires a non-space char so we don't collapse indentation.
  for (const m of text.matchAll(/(?<=\S) {2,}/g)) {
    fixes.push({
      from: offset + m.index!,
      to: offset + m.index! + m[0].length,
      insert: " ",
    });
  }

  // 2. Remove space(s) immediately before punctuation: " ." → "."
  //    Targets . , ! ? ; : — the standard set.
  for (const m of text.matchAll(/ +([.,!?;:])/g)) {
    fixes.push({
      from: offset + m.index!,
      to: offset + m.index! + m[0].length,
      insert: m[1],
    });
  }

  // ── Delete/paste-only rules (would interfere with typing) ──

  if (deleteRules) {
    // 3. Double period that isn't part of an ellipsis: ".." → "."
    //    Negative lookaround ensures "..." stays intact.
    for (const m of text.matchAll(/(?<!\.)\.\.(?!\.)/g)) {
      fixes.push({
        from: offset + m.index!,
        to: offset + m.index! + 2,
        insert: ".",
      });
    }

    // 4. Orphaned comma/semicolon after sentence-ending punctuation:
    //    ". , " or ".  ;" → ". "
    for (const m of text.matchAll(/([.!?])\s+[,;]\s?/g)) {
      fixes.push({
        from: offset + m.index!,
        to: offset + m.index! + m[0].length,
        insert: m[1] + " ",
      });
    }

    // 5. Comma/semicolon directly adjacent to sentence-end punctuation
    //    in either order: ".," → "."  and ",." → "."
    for (const m of text.matchAll(/[,;]([.!?])/g)) {
      fixes.push({
        from: offset + m.index!,
        to: offset + m.index! + m[0].length,
        insert: m[1],
      });
    }
    for (const m of text.matchAll(/([.!?])[,;]/g)) {
      fixes.push({
        from: offset + m.index!,
        to: offset + m.index! + m[0].length,
        insert: m[1],
      });
    }
  }

  // Sort by position and de-overlap: if two fixes cover the same region,
  // keep the first (higher-priority) one.
  fixes.sort((a, b) => a.from - b.from);
  const deduped: Fix[] = [];
  for (const fix of fixes) {
    if (deduped.length === 0 || fix.from >= deduped[deduped.length - 1].to) {
      deduped.push(fix);
    }
  }
  return deduped;
}

export const punctuationCleanup = ViewPlugin.fromClass(
  class {
    update(update: ViewUpdate) {
      if (!update.docChanged) return;

      // Determine the type of user change. Skip programmatic dispatches
      // (our own cleanup has no annotation → isUserChange is false → skip).
      const isTyping = update.transactions.some((tr) =>
        tr.isUserEvent("input.type"),
      );
      const isDelete = update.transactions.some((tr) =>
        tr.isUserEvent("delete"),
      );
      const isPaste = update.transactions.some(
        (tr) =>
          tr.isUserEvent("input.paste") || tr.isUserEvent("input.drop"),
      );
      const isUserChange = isTyping || isDelete || isPaste;
      if (!isUserChange) return;

      const doc = update.state.doc;

      // Find the changed region in the new document.
      let changeFrom = doc.length;
      let changeTo = 0;
      update.changes.iterChangedRanges((_fromA, _toA, fromB, toB) => {
        changeFrom = Math.min(changeFrom, fromB);
        changeTo = Math.max(changeTo, toB);
      });
      if (changeFrom > changeTo) return;

      // Expand by a small buffer to catch patterns that span the edit boundary.
      const BUFFER = 20;
      const scanFrom = Math.max(0, changeFrom - BUFFER);
      const scanTo = Math.min(doc.length, changeTo + BUFFER);
      const text = doc.sliceString(scanFrom, scanTo);

      // Run always-active rules on all changes; delete-specific rules only on
      // delete/paste (so typing "..." isn't collapsed mid-keystroke).
      const fixes = collectFixes(text, scanFrom, isDelete || isPaste);
      if (fixes.length === 0) return;

      update.view.dispatch({ changes: fixes });
    }
  },
);
