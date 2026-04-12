import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playRewriteChime } from "../../lib/chime";
import { Kbd, ParticleBurst, Sparkle } from "./popupShared";

export type InsertMode = "dice" | "custom";

interface InsertPopupProps {
  /** Viewport-relative coords of the cursor's empty line. `null` hides the popup. */
  coords: { top: number; left: number } | null;
  /** Async handler — runs the Claude insert and resolves when the new paragraph has been written. */
  onAction: (mode: InsertMode, prompt?: string) => Promise<void>;
}

/**
 * Local UI phase for the insert flow.
 * - "menu": initial state, shows 🎲 Dice + ✏️ Custom buttons
 * - "custom": Custom was clicked, shows the inline prompt input
 *
 * Phase resets to "menu" whenever the popup coords become null (cursor
 * leaves the empty line) so the next time it pops up, it starts fresh.
 */
type Phase = "menu" | "custom";

/**
 * Floating assistant panel that appears above the cursor when it sits on
 * an empty line. Offers two ways to have Claude write a new paragraph:
 * - Dice: Claude decides what to write based on the surrounding context
 * - Custom: user types a prompt describing what they want
 *
 * The parent computes `coords` from `view.coordsAtPos(cursor.head)`. A
 * non-null value means the cursor is on a qualifying empty line and the
 * popup should show.
 *
 * Shares the same visual language as SelectionPopup: sparkle icons, shimmer
 * sweep while busy, accent glow on the popup chrome, particle burst + chime
 * on success. See popupShared.tsx for the shared primitives.
 */
export default function InsertPopup({ coords, onAction }: InsertPopupProps) {
  const [phase, setPhase] = useState<Phase>("menu");
  const [busy, setBusy] = useState<InsertMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [burstKey, setBurstKey] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset to menu phase when the popup hides (cursor leaves empty line).
  // Without this, switching from custom → somewhere else → back to an empty
  // line would re-open the custom phase with stale draft text.
  useEffect(() => {
    if (coords === null) {
      setPhase("menu");
      setDraft("");
      setError(null);
    }
  }, [coords]);

  // Auto-focus the input when entering custom phase.
  useEffect(() => {
    if (phase === "custom" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [phase]);

  const runInsert = async (mode: InsertMode, prompt?: string) => {
    if (busy) return;
    setError(null);
    setBusy(mode);
    try {
      await onAction(mode, prompt);
      // Success — chime + burst + reset to menu so the next trigger is clean.
      playRewriteChime();
      setBurstKey((k) => k + 1);
      setPhase("menu");
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Insert failed");
    } finally {
      setBusy(null);
    }
  };

  const handleCustomSubmit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    runInsert("custom", trimmed);
  };

  const handleCustomKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCustomSubmit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setPhase("menu");
      setDraft("");
    }
  };

  const isBusy = busy !== null;

  return (
    <AnimatePresence>
      {coords && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.97 }}
          transition={{ duration: 0.14, ease: [0.2, 0.8, 0.2, 1] }}
          className={`fixed z-50 flex items-center gap-1 rounded-lg border border-bg-tertiary bg-bg-secondary px-1.5 py-1 shadow-xl shadow-black/40 backdrop-blur-sm pointer-events-none ${
            isBusy ? "popup-busy-glow" : ""
          }`}
          style={{
            // Position above the cursor — matches SelectionPopup's offset.
            top: Math.max(coords.top - 52, 8),
            left: coords.left,
            userSelect: "none",
          }}
          onMouseDown={(e) => {
            // Preserve editor focus — without this, clicking buttons or the
            // input would steal focus and collapse the cursor's visible
            // position (which is how the popup's coords are computed).
            // For the input specifically we still want the input to receive
            // the click, so we only preventDefault when it's NOT the target.
            if ((e.target as HTMLElement).tagName !== "INPUT") {
              e.preventDefault();
            }
          }}
        >
          {burstKey > 0 && <ParticleBurst key={burstKey} />}

          {phase === "menu" && (
            <>
              <motion.button
                type="button"
                disabled={isBusy}
                onClick={() => runInsert("dice")}
                whileHover={!isBusy ? { scale: 1.04 } : undefined}
                whileTap={!isBusy ? { scale: 0.94 } : undefined}
                transition={{ duration: 0.1, ease: "easeOut" }}
                className={`pointer-events-auto relative flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  busy === "dice"
                    ? "text-accent popup-shimmer-busy"
                    : "text-text-primary hover:bg-bg-tertiary"
                } ${isBusy && busy !== "dice" ? "opacity-35" : ""}`}
              >
                <Sparkle pulsing={busy === "dice"} />
                <span>{busy === "dice" ? "Rolling…" : "Dice"}</span>
              </motion.button>

              <motion.button
                type="button"
                disabled={isBusy}
                onClick={() => setPhase("custom")}
                whileHover={!isBusy ? { scale: 1.04 } : undefined}
                whileTap={!isBusy ? { scale: 0.94 } : undefined}
                transition={{ duration: 0.1, ease: "easeOut" }}
                className={`pointer-events-auto relative flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors text-text-primary hover:bg-bg-tertiary ${
                  isBusy ? "opacity-35" : ""
                }`}
              >
                <Sparkle pulsing={false} />
                <span>Custom</span>
              </motion.button>
            </>
          )}

          {phase === "custom" && (
            <div className="pointer-events-auto flex items-center gap-1.5 px-1 py-0.5">
              <Sparkle pulsing={busy === "custom"} />
              <input
                ref={inputRef}
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleCustomKey}
                disabled={isBusy}
                placeholder="What should Claude write about?"
                className={`bg-bg-primary text-text-primary placeholder-text-muted text-xs px-2 py-1 rounded outline-none border ${
                  busy === "custom"
                    ? "border-accent/70 popup-shimmer-busy"
                    : "border-bg-tertiary/80 focus:border-accent/60"
                } min-w-[260px]`}
                spellCheck={false}
              />
              <motion.button
                type="button"
                disabled={isBusy || !draft.trim()}
                onClick={handleCustomSubmit}
                whileHover={!isBusy && draft.trim() ? { scale: 1.04 } : undefined}
                whileTap={!isBusy && draft.trim() ? { scale: 0.94 } : undefined}
                transition={{ duration: 0.1, ease: "easeOut" }}
                className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  busy === "custom"
                    ? "text-accent"
                    : draft.trim()
                      ? "text-accent hover:bg-bg-tertiary"
                      : "text-text-muted opacity-50 cursor-not-allowed"
                }`}
                title="Generate (Enter)"
              >
                {busy === "custom" ? "Writing…" : "Go"}
              </motion.button>
              {!isBusy && (
                <span className="ml-0.5">
                  <Kbd>Esc</Kbd>
                </span>
              )}
            </div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              className="ml-2 text-xs text-danger max-w-[200px] truncate"
              title={error}
            >
              {error}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
