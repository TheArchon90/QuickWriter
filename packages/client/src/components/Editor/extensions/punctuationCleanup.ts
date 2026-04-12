import { Annotation } from "@codemirror/state";
import { ViewPlugin, ViewUpdate } from "@codemirror/view";

// Annotation marking our own dispatches so we can skip them on re-entry.
const isPunctFix = Annotation.define<boolean>();

/**
 * Real-time punctuation cleanup.
 *
 * Fires after every document change, scans the area around the edit for
 * common punctuation artifacts, and fixes them with precise individual
 * changes so the cursor stays in place.
 *
 * Does NOT filter by user-event type — Vim-mode operations may not carry
 * standard event labels. Instead, skips only our own annotated dispatches
 * and detects deletions by inspecting the actual change deltas.
 */

interface Fix {
  from: number;
  to: number;
  insert: string;
}

/**
 * Collect all fixes for the text in [offset, offset + text.length).
 *
 * @param deleteRules  - if true, run rules that should only fire when text
 *                       was removed (double-period, orphaned comma, etc.)
 */
function collectFixes(
  text: string,
  offset: number,
  deleteRules: boolean,
): Fix[] {
  const fixes: Fix[] = [];

  // ── Always-active rules ──

  // 1. Collapse double+ spaces to single (not at line/doc start).
  for (const m of text.matchAll(/(?<=\S) {2,}/g)) {
    fixes.push({
      from: offset + m.index!,
      to: offset + m.index! + m[0].length,
      insert: " ",
    });
  }

  // 2. Remove space(s) immediately before punctuation: " ." → "."
  for (const m of text.matchAll(/ +([.,!?;:])/g)) {
    fixes.push({
      from: offset + m.index!,
      to: offset + m.index! + m[0].length,
      insert: m[1],
    });
  }

  // ── Delete/paste-only rules (would eat "..." mid-typing etc.) ──

  if (deleteRules) {
    // 3. Double period that isn't part of an ellipsis: ".." → "."
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

  // Sort by position and de-overlap (keep first/highest priority).
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

      // Skip our own cleanup dispatches.
      if (update.transactions.some((tr) => tr.annotation(isPunctFix))) return;

      const doc = update.state.doc;

      // Find the changed region in the new document.
      let changeFrom = doc.length;
      let changeTo = 0;
      update.changes.iterChangedRanges((_fromA, _toA, fromB, toB) => {
        changeFrom = Math.min(changeFrom, fromB);
        changeTo = Math.max(changeTo, toB);
      });
      if (changeFrom > changeTo) return;

      // Detect whether text was removed (not just inserted) by inspecting
      // the actual change deltas. This is annotation-independent — works for
      // Vim-mode, undo, and any other source of deletions.
      let hasRemoval = false;
      update.changes.iterChanges((fromA, toA, fromB, toB) => {
        if (toA - fromA > toB - fromB) hasRemoval = true;
      });

      // Expand by a small buffer to catch patterns at edit boundaries.
      const BUFFER = 20;
      const scanFrom = Math.max(0, changeFrom - BUFFER);
      const scanTo = Math.min(doc.length, changeTo + BUFFER);
      const text = doc.sliceString(scanFrom, scanTo);

      const fixes = collectFixes(text, scanFrom, hasRemoval);
      if (fixes.length === 0) return;

      update.view.dispatch({
        changes: fixes,
        annotations: isPunctFix.of(true),
      });
    }
  },
);
