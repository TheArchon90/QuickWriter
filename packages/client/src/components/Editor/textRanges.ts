/**
 * Pure range-finding functions used by the highlight/selection shortcuts.
 *
 * Conventions:
 *   - Sentence boundaries: `.`, `!`, `?`, `\n`
 *   - Paragraph boundaries: blank lines (`\n\n` — two consecutive newlines,
 *     or start/end of document)
 *   - All ranges are `{ start, end }` where `end` is exclusive (CodeMirror style)
 *   - No attempt to trim leading/trailing whitespace — callers can slice if needed
 */

export interface Range {
  start: number;
  end: number;
}

const SENTENCE_TERMINATOR = /[.!?\n]/;
const ATTACHING_PUNCT = /[,;:]/;
const SENTENCE_TERMINATOR_CHAR = /[.!?]/;
const WHITESPACE = /\s/;

/**
 * Returns the range of the sentence CONTAINING the cursor. Walks both directions
 * from `cursor` until a sentence terminator is found, then includes the terminator
 * at the end.
 */
export function sentenceRangeAtCursor(text: string, cursor: number): Range {
  let start = cursor;
  let end = cursor;
  while (start > 0 && !SENTENCE_TERMINATOR.test(text[start - 1])) start--;
  while (end < text.length && !SENTENCE_TERMINATOR.test(text[end])) end++;
  if (end < text.length) end++;
  return { start, end };
}

/**
 * Returns the range of the sentence BEFORE the one containing the cursor.
 * Returns null if we're already in the first sentence of the document.
 */
export function previousSentenceRange(text: string, cursor: number): Range | null {
  // Find where the current sentence starts
  let currStart = cursor;
  while (currStart > 0 && !SENTENCE_TERMINATOR.test(text[currStart - 1])) currStart--;
  if (currStart === 0) return null;

  // The previous sentence's end (exclusive) is `currStart` — the position
  // right after the previous sentence's terminator
  const prevEnd = currStart;

  // Walk back from just before the terminator to find the previous sentence's start
  let prevStart = currStart - 1;
  while (prevStart > 0 && !SENTENCE_TERMINATOR.test(text[prevStart - 1])) prevStart--;

  return { start: prevStart, end: prevEnd };
}

/**
 * Returns a range from the cursor to the end of the current paragraph.
 * A paragraph ends at a blank line (two consecutive newlines) or end of document.
 */
export function paragraphForwardRange(text: string, cursor: number): Range {
  let end = cursor;
  while (end < text.length) {
    // Found the start of a blank-line boundary
    if (text[end] === "\n" && end + 1 < text.length && text[end + 1] === "\n") break;
    end++;
  }
  return { start: cursor, end };
}

/**
 * Returns a range from the start of the current paragraph to the cursor.
 * A paragraph starts after a blank line (two consecutive newlines) or at the
 * start of the document.
 */
export function paragraphBackwardRange(text: string, cursor: number): Range {
  let start = cursor;
  while (start > 0) {
    // Reached a blank-line boundary above — stop, keeping start at the first
    // character of the current paragraph
    if (start >= 2 && text[start - 1] === "\n" && text[start - 2] === "\n") break;
    start--;
  }
  return { start, end: cursor };
}

/**
 * Given word bounds `[wordStart, wordEnd)` in `text`, compute a "smart" deletion
 * range that cleans up attached punctuation and surrounding whitespace, so that
 * deleting the word doesn't leave floating commas, orphan periods, or double
 * spaces behind.
 *
 * Rules:
 *   - Attaching punct (`,` `;` `:`) immediately after the word → consume it
 *     and its trailing whitespace. Leading space stays. Middle-of-list case.
 *   - Sentence terminator (`.` `!` `?`) immediately after the word:
 *       - If the word is the ONLY content in its sentence (walking backward
 *         past whitespace hits another terminator or start-of-doc) → consume
 *         the terminator(s) and trailing whitespace. Whole sentence dies.
 *       - Otherwise → leave the terminator in place (it now belongs to the
 *         preceding clause). Consume leading whitespace AND any preceding
 *         attaching punct that was clinging to this word's role in the clause.
 *   - Neither → consume trailing whitespace, or if at end-of-line/doc, consume
 *     one leading space instead to avoid an orphan.
 */
export function smartDeleteWordRange(text: string, wordStart: number, wordEnd: number): Range {
  let start = wordStart;
  let end = wordEnd;
  const nextChar = end < text.length ? text[end] : "";

  if (ATTACHING_PUNCT.test(nextChar)) {
    while (end < text.length && ATTACHING_PUNCT.test(text[end])) end++;
    while (end < text.length && WHITESPACE.test(text[end])) end++;
    return { start, end };
  }

  if (SENTENCE_TERMINATOR_CHAR.test(nextChar)) {
    // Is this word alone in its sentence?
    let probe = start - 1;
    while (probe >= 0 && WHITESPACE.test(text[probe])) probe--;
    const aloneInSentence = probe < 0 || SENTENCE_TERMINATOR_CHAR.test(text[probe]);

    if (aloneInSentence) {
      // Consume all consecutive terminators (ellipsis) + trailing whitespace
      while (end < text.length && SENTENCE_TERMINATOR_CHAR.test(text[end])) end++;
      while (end < text.length && WHITESPACE.test(text[end])) end++;
      return { start, end };
    }

    // Leave the terminator; eat leading whitespace and any preceding
    // attaching punct that was clinging to this word.
    while (start > 0 && WHITESPACE.test(text[start - 1])) start--;
    while (start > 0 && ATTACHING_PUNCT.test(text[start - 1])) {
      start--;
      while (start > 0 && WHITESPACE.test(text[start - 1])) start--;
    }
    return { start, end };
  }

  // No trailing punct — consume trailing whitespace, or fall back to eating
  // one leading space if we're at end-of-line/doc.
  if (end < text.length && WHITESPACE.test(text[end])) {
    while (end < text.length && WHITESPACE.test(text[end])) end++;
  } else if (start > 0 && WHITESPACE.test(text[start - 1])) {
    start--;
  }

  return { start, end };
}
