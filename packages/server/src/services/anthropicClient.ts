import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  throw new Error(
    "Missing ANTHROPIC_API_KEY environment variable — check .env at the monorepo root."
  );
}

// Singleton client shared across all rewrite requests.
export const anthropic = new Anthropic({ apiKey });
