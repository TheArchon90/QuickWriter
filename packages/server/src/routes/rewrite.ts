import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { rewriteSelection, type RewriteAction } from "../services/rewriteService.js";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { document, selection, action } = req.body as {
      document?: string;
      selection?: string;
      action?: RewriteAction;
    };

    if (typeof document !== "string") {
      return res.status(400).json({ error: "document (string) is required" });
    }
    if (typeof selection !== "string" || selection.trim().length === 0) {
      return res.status(400).json({ error: "selection (non-empty string) is required" });
    }
    if (action !== "expand" && action !== "concise") {
      return res.status(400).json({ error: "action must be 'expand' or 'concise'" });
    }

    const result = await rewriteSelection({ document, selection, action });

    console.log(
      `[rewrite] ${action} — in=${result.usage.input_tokens} out=${result.usage.output_tokens} ` +
      `cache_read=${result.usage.cache_read_input_tokens} cache_create=${result.usage.cache_creation_input_tokens}`
    );

    res.json({ text: result.text });
  } catch (err) {
    // Typed Anthropic exceptions first, then generic fallback.
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: "Claude rate limit hit — wait a moment and retry." });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return res.status(500).json({ error: "Claude auth failed — check ANTHROPIC_API_KEY in .env" });
    }
    if (err instanceof Anthropic.APIError) {
      console.error(`[rewrite] Claude API error ${err.status}:`, err.message);
      return res.status(502).json({ error: `Claude API error: ${err.message}` });
    }
    console.error("[rewrite] Unexpected error:", err);
    res.status(500).json({ error: "Rewrite failed" });
  }
});

export default router;
