import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playRewriteChime } from "../../lib/chime";
import { Kbd, ParticleBurst, Sparkle } from "./popupShared";

export type RewriteAction = "expand" | "concise";

interface SelectionPopupProps {
  /** Viewport-relative coords of the top-left of the selection. `null` hides the popup. */
  coords: { top: number; left: number } | null;
  /** Async handler — runs the Claude rewrite and resolves when the selection has been replaced. */
  onAction: (action: RewriteAction) => Promise<void>;
}

// Per-action copy. `busy` is the verb shown while the request is in flight.
const ACTION_LABELS: Record<RewriteAction, { idle: string; busy: string }> = {
  expand: { idle: "Expand", busy: "Expanding" },
  concise: { idle: "Concise", busy: "Tightening" },
};

// Keybinding glyphs shown in the kbd chip next to each button label.
const ACTION_SHORTCUTS: Record<RewriteAction, string> = {
  expand: "\u2318E",
  concise: "\u2318\u21E7E",
};

/**
 * Floating assistant panel that appears above a selection in the editor.
 * Offers Claude-powered rewrite actions (expand, concise).
 *
 * Visual states:
 * - Idle: subtle border + button hover scale
 * - Busy: accent glow pulsing around the popup, shimmer sweep across the
 *   active button, pulsing sparkle icon, and a disabled-looking sibling
 * - Error: right-aligned error line, truncated with a tooltip
 *
 * The parent computes `coords` from `view.coordsAtPos(selection.from)`; a
 * non-null value means a selection is active and the popup should show.
 */
export default function SelectionPopup({ coords, onAction }: SelectionPopupProps) {
  const [busy, setBusy] = useState<RewriteAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Incremented on each successful rewrite to re-mount the ParticleBurst
  // component — a key change gives us a fresh one-shot animation without
  // needing an explicit unmount timer.
  const [burstKey, setBurstKey] = useState(0);

  const handle = async (action: RewriteAction) => {
    if (busy) return;
    setError(null);
    setBusy(action);
    try {
      await onAction(action);
      // Success path — play chime + trigger particle burst. NOT in finally:
      // we only want these on a clean resolve, not on error or dismiss.
      playRewriteChime();
      setBurstKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rewrite failed");
    } finally {
      setBusy(null);
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
            // Popup sits roughly 52px tall once rendered; position its bottom
            // a few pixels above the top of the selection.
            top: Math.max(coords.top - 52, 8),
            left: coords.left,
            // Prevent selection loss on click — buttons keep editor selection alive.
            userSelect: "none",
          }}
          onMouseDown={(e) => {
            // Don't let mousedown on the popup steal focus from the editor; keeps
            // the selection visible while the rewrite runs.
            e.preventDefault();
          }}
        >
          {burstKey > 0 && <ParticleBurst key={burstKey} />}
          {(Object.keys(ACTION_LABELS) as RewriteAction[]).map((action) => {
            const active = busy === action;
            const dimmed = isBusy && !active;
            const { idle, busy: busyLabel } = ACTION_LABELS[action];
            return (
              <motion.button
                key={action}
                type="button"
                disabled={isBusy}
                onClick={() => handle(action)}
                whileHover={!isBusy ? { scale: 1.04 } : undefined}
                whileTap={!isBusy ? { scale: 0.94 } : undefined}
                transition={{ duration: 0.1, ease: "easeOut" }}
                className={`pointer-events-auto relative flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  active
                    ? "text-accent popup-shimmer-busy"
                    : "text-text-primary hover:bg-bg-tertiary"
                } ${dimmed ? "opacity-35" : ""}`}
              >
                <Sparkle pulsing={active} />
                <span>{active ? `${busyLabel}…` : idle}</span>
                {!active && (
                  <span className="ml-0.5">
                    <Kbd>{ACTION_SHORTCUTS[action]}</Kbd>
                  </span>
                )}
              </motion.button>
            );
          })}
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
