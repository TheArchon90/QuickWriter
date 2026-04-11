export const CONTRACTION_MAP: Record<string, string> = {
  im: "I'm", id: "I'd", ill: "I'll", ive: "I've",
  dont: "don't", cant: "can't", wont: "won't",
  wouldnt: "wouldn't", couldnt: "couldn't", shouldnt: "shouldn't",
  isnt: "isn't", arent: "aren't", wasnt: "wasn't", werent: "weren't",
  hasnt: "hasn't", havent: "haven't", hadnt: "hadn't",
  doesnt: "doesn't", didnt: "didn't",
  youre: "you're", youll: "you'll", youve: "you've",
  theyre: "they're", theyll: "they'll", theyve: "they've",
  thats: "that's", heres: "here's", theres: "there's",
  wheres: "where's", whats: "what's", whos: "who's",
  whens: "when's", whys: "why's", hows: "how's",
  lets: "let's", its: "it's", were: "we're",
  shes: "she's", hes: "he's", itll: "it'll",
  shell: "she'll", hell: "he'll", aint: "ain't",
  mustnt: "mustn't", mightnt: "mightn't", neednt: "needn't",
  oclock: "o'clock",
};

export const ABBREVIATIONS = new Set([
  "mr", "mrs", "ms", "dr", "prof", "rev", "hon", "st", "jr", "sr",
  "e.g", "i.e", "etc", "vs", "fig", "approx", "no", "vol", "pp", "pg", "p",
  "a.m", "p.m", "inc", "ltd", "co", "corp", "dept", "est", "min", "max", "avg",
]);

export function expandContraction(word: string): string | null {
  const lower = word.toLowerCase();
  const replacement = CONTRACTION_MAP[lower];
  if (!replacement) return null;
  if (word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

export function shouldCapitalizeAfter(textBefore: string): boolean {
  if (textBefore.length === 0) return true;
  if (textBefore.endsWith("\n")) return true;
  const trimmed = textBefore.trimEnd();
  if (trimmed.length === 0) return true;
  const lastChar = trimmed[trimmed.length - 1];
  if (![".", "!", "?"].includes(lastChar)) return false;
  if (textBefore.length === trimmed.length) return false;
  const wordMatch = trimmed.match(/(\S+)\.$/);
  if (lastChar === "." && wordMatch) {
    const precedingWord = wordMatch[1].toLowerCase();
    const withoutDot = precedingWord.endsWith(".")
      ? precedingWord.slice(0, -1)
      : precedingWord;
    if (ABBREVIATIONS.has(withoutDot) || ABBREVIATIONS.has(precedingWord)) {
      return false;
    }
  }
  return true;
}

export function isStandaloneI(text: string, pos: number): boolean {
  if (text[pos] !== "i") return false;
  const before = pos > 0 ? text[pos - 1] : "";
  const after = pos < text.length - 1 ? text[pos + 1] : "";
  const isWordChar = (ch: string) => /[a-zA-Z0-9_]/.test(ch);
  if (before && isWordChar(before)) return false;
  if (after && isWordChar(after)) return false;
  return true;
}
