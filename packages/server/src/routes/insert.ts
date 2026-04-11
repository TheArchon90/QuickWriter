import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { insertParagraph, type InsertMode } from "../services/insertService.js";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { document, position, mode, prompt } = req.body as {
      document?: string;
      position?: number;
      mode?: InsertMode;
      prompt?: string;
    };

    if (typeof document !== "string") {
      return res.status(400).json({ error: "document (string) is required" });
    }
    if (typeof position !== "number" || position < 0 || position > document.length) {
      return res.status(400).json({ error: "position (number within document) is required" });
    }
    if (mode !== "dice" && mode !== "custom") {
      return res.status(400).json({ error: "mode must be 'dice' or 'custom'" });
    }
    if (mode === "custom" && (typeof prompt !== "string" || !prompt.trim())) {
      return res.status(400).json({ error: "prompt (non-empty string) is required when mode is 'custom'" });
    }

    const result = await insertParagraph({ document, position, mode, prompt });

    console.log(
      `[insert] ${mode} — in=${result.usage.input_tokens} out=${result.usage.output_tokens} ` +
      `cache_read=${result.usage.cache_read_input_tokens} cache_create=${result.usage.cache_creation_input_tokens}`
    );

    res.json({ text: result.text });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: "Claude rate limit hit — wait a moment and retry." });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return res.status(500).json({ error: "Claude auth failed — check ANTHROPIC_API_KEY in .env" });
    }
    if (err instanceof Anthropic.APIError) {
      console.error(`[insert] Claude API error ${err.status}:`, err.message);
      return res.status(502).json({ error: `Claude API error: ${err.message}` });
    }
    console.error("[insert] Unexpected error:", err);
    res.status(500).json({ error: "Insert failed" });
  }
});

export default router;
