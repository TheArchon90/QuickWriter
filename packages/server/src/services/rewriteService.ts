import { anthropic } from "./anthropicClient.js";

export type RewriteAction = "expand" | "concise";

const MODEL = "claude-opus-4-6";
const MAX_TOKENS = 64000;

const SYSTEM_PROMPT = `You are a writing assistant embedded in a prose editor. The user has selected part of their document and wants you to rewrite that selection with a specific transformation.

Your single most important job is VOICE PRESERVATION. Study the full document provided as context, and match the author's voice EXACTLY:
- Rhythm and sentence-length patterns
- Word choice — their go-to verbs, adjectives, and metaphors
- Tone and formality level
- Punctuation habits and spacing
- Any quirks, slang, contractions, or stylistic fingerprints
- The overall feel of the prose

Your rewrite MUST read as if the same author wrote it. Do NOT polish informal prose. Do NOT sanitize. Do NOT professionalize. Do NOT add your own flourishes or "improve" things in a way that introduces your voice. The goal is voice-invisible editing — your changes should feel like the author's own work on a better day.

OUTPUT FORMAT — CRITICAL:
Return ONLY the rewritten selection, as plain text. No preamble. No explanation. No surrounding quotes. No markdown formatting (unless the surrounding prose uses markdown). No "here's the revised version" or similar. Just the replacement text, ready to drop directly into the document in place of the original selection. It must flow naturally with what comes immediately before and immediately after the selection in the document.`;

function actionInstruction(action: RewriteAction): string {
  switch (action) {
    case "expand":
      return `<instruction>
Expand the selected text. Add depth, detail, elaboration, or additional beats. Give the idea more room to breathe. Match the voice of the surrounding document exactly. The expanded version should flow naturally from what comes before and into what comes after.
</instruction>`;
    case "concise":
      return `<instruction>
Tighten the selected text. Cut unnecessary words, combine redundant ideas, sharpen the language. The result should feel lean but lose no meaning, tone, or voice. Match the voice of the surrounding document exactly. The tightened version should flow naturally from what comes before and into what comes after.
</instruction>`;
  }
}

export interface RewriteInput {
  document: string;
  selection: string;
  action: RewriteAction;
}

export interface RewriteResult {
  text: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens: number;
    cache_read_input_tokens: number;
  };
}

/**
 * Rewrite a selection from the user's document with the given action.
 *
 * Uses streaming under the hood (to avoid HTTP timeouts on long rewrites) but
 * returns a single finalized response via `.finalMessage()`. Adaptive thinking
 * is on so Claude can reason about voice-matching.
 *
 * Prompt caching: the system prompt and document context are marked with
 * `cache_control: ephemeral` so repeated rewrites on the same document reuse
 * the cached prefix (~90% cost discount on the cached portion).
 */
export async function rewriteSelection(input: RewriteInput): Promise<RewriteResult> {
  const { document, selection, action } = input;

  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    // Adaptive thinking + max effort = deepest available reasoning on Opus 4.6.
    // budget_tokens is deprecated on Opus 4.6; adaptive thinking replaces it
    // and has no cap, so Claude can think as much as the task warrants.
    thinking: { type: "adaptive" },
    output_config: { effort: "max" },
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `<document_context>\n${document}\n</document_context>`,
            cache_control: { type: "ephemeral" },
          },
          {
            type: "text",
            text: `<selection_to_rewrite>\n${selection}\n</selection_to_rewrite>\n\n${actionInstruction(action)}\n\nReturn ONLY the rewritten selection, as plain text. Nothing else.`,
          },
        ],
      },
    ],
  });

  const finalMessage = await stream.finalMessage();

  // Extract the first (and usually only) text block from the response.
  // Thinking blocks come first in content if adaptive thinking kicked in;
  // skip them and pull the text block.
  const textBlock = finalMessage.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text block in Claude response");
  }

  return {
    text: textBlock.text,
    usage: {
      input_tokens: finalMessage.usage.input_tokens,
      output_tokens: finalMessage.usage.output_tokens,
      cache_creation_input_tokens: finalMessage.usage.cache_creation_input_tokens ?? 0,
      cache_read_input_tokens: finalMessage.usage.cache_read_input_tokens ?? 0,
    },
  };
}
