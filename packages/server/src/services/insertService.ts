import { anthropic } from "./anthropicClient.js";

export type InsertMode = "dice" | "custom";

const MODEL = "claude-opus-4-6";
const MAX_TOKENS = 64000;

const SYSTEM_PROMPT = `You are a writing assistant embedded in a prose editor. The user's cursor is positioned on an empty line in their document, and they've asked you to write a new paragraph that goes there.

Your single most important job is VOICE PRESERVATION. Study the full document provided as context, and match the author's voice EXACTLY:
- Rhythm and sentence-length patterns
- Word choice — their go-to verbs, adjectives, and metaphors
- Tone and formality level
- Punctuation habits and spacing
- Any quirks, slang, contractions, or stylistic fingerprints
- The overall feel of the prose

Your new paragraph MUST read as if the same author wrote it — as if they picked up the pen on a good day and kept going. Do NOT polish informal prose. Do NOT sanitize. Do NOT professionalize. Do NOT add your own flourishes or "improve" things. The goal is voice-invisible authorship.

CONTEXT — CRITICAL:
The new paragraph will be INSERTED between what comes BEFORE the insertion point and what comes AFTER. You will see both halves as separate context blocks. Your paragraph must:
- Flow naturally from the preceding content into the following content, like a seam you can't see
- Advance the ideas, narrative, or argument at the rate the author's other paragraphs warrant
- NOT repeat content already present in the surrounding text
- NOT contradict or undermine what's already established
- NOT start with a transitional phrase like "Moreover", "Furthermore", or "In addition" unless that's literally how this author writes
- Respect the average paragraph length and rhythm of the surrounding paragraphs

OUTPUT FORMAT — CRITICAL:
Return ONLY the new paragraph text, as plain text. No preamble. No explanation. No surrounding quotes. No markdown code fences. No leading or trailing blank lines. No "Here's a paragraph:" or similar framing. Just the paragraph, ready to drop directly into the empty line. It must flow naturally from the content before the insertion point into the content after it.`;

function modeInstruction(mode: InsertMode, prompt?: string): string {
  if (mode === "dice") {
    return `<instruction>
The user has asked you to decide what this paragraph should be about. Read the surrounding context carefully. Write whatever paragraph the author MOST PROBABLY would have written next, based on where the piece is going. Make a confident, grounded choice — not a random one, not a hedging one. Pick the most natural continuation and commit to it.
</instruction>`;
  }
  return `<instruction>
The user has given you specific direction for what they want in this paragraph:

<user_direction>
${prompt ?? ""}
</user_direction>

Write the paragraph according to their direction, in their voice, making sure it still fits naturally between the surrounding context.
</instruction>`;
}

export interface InsertInput {
  document: string;
  position: number;
  mode: InsertMode;
  prompt?: string;
}

export interface InsertResult {
  text: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens: number;
    cache_read_input_tokens: number;
  };
}

/**
 * Generate a new paragraph at the user's cursor position, with Claude seeing
 * explicit before/after context so it can write something that fits between.
 *
 * Same streaming + adaptive thinking + max effort config as the rewrite
 * service. Prompt caching on both the system prompt and the context block
 * so repeated inserts on the same document reuse the prefix.
 */
export async function insertParagraph(input: InsertInput): Promise<InsertResult> {
  const { document, position, mode, prompt } = input;

  // Split the document at the insertion point so Claude sees the two halves
  // as separate tagged blocks — this makes the "write between these" task
  // unambiguous in a way a single <document> block with a marker can't.
  const before = document.slice(0, position);
  const after = document.slice(position);

  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    // Adaptive thinking + max effort for the same reasons as rewrite:
    // no artificial cap on reasoning, max-correctness bias on Opus 4.6.
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
            text: `<context_before_insertion>\n${before}\n</context_before_insertion>\n\n<context_after_insertion>\n${after}\n</context_after_insertion>`,
            cache_control: { type: "ephemeral" },
          },
          {
            type: "text",
            text: `${modeInstruction(mode, prompt)}\n\nReturn ONLY the new paragraph, as plain text. Nothing else.`,
          },
        ],
      },
    ],
  });

  const finalMessage = await stream.finalMessage();

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
