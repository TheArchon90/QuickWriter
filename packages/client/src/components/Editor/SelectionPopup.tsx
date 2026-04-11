import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playRewriteChime } from "../../lib/chime";

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

// Fixed particle trajectories for the success burst. Exactly 6 — more feels noisy.
const PARTICLES = [
  { x: -32, y: -18, rotate: -120, delay: 0 },
  { x: 24, y: -28, rotate: 85, delay: 0.04 },
  { x: 38, y: 6, rotate: 140, delay: 0.02 },
  { x: -28, y: 14, rotate: -60, delay: 0.06 },
  { x: 8, y: -36, rotate: 200, delay: 0.03 },
  { x: -42, y: -4, rotate: -180, delay: 0.05 },
];

/**
 * Small keybinding chip rendered next to a button label. Uses the theme's
 * tertiary bg tint and muted text so it reads as secondary info, not a target.
 */
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center font-mono text-[9px] px-1 py-0.5 rounded bg-bg-tertiary/60 text-text-muted border border-bg-tertiary/70 tracking-tight">
      {children}
    </span>
  );
}

/**
 * One-shot sparkle burst that plays when a rewrite succeeds. Each mount
 * animates six accent-colored dots outward from the popup center, rotating
 * and fading. Driven by a key change from the parent — no internal state.
 * Container and particles are pointer-events-none so the popup stays clickable.
 */
function ParticleBurst() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible">
      {PARTICLES.map((p, i) => (
        <motion.div
          key={i}
          className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full bg-accent pointer-events-none"
          style={{ boxShadow: "0 0 6px rgba(88,166,255,0.8)" }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.6, rotate: 0 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 1.1, rotate: p.rotate }}
          transition={{
            duration: 0.65,
            delay: p.delay,
            ease: [0.2, 0.8, 0.2, 1],
          }}
        />
      ))}
    </div>
  );
}

/**
 * Four-point sparkle glyph. Used as the AI-action affordance on each button.
 * Pulses while its button is busy via the `.sparkle-pulse` class in index.css.
 */
function Sparkle({ pulsing }: { pulsing: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={pulsing ? "sparkle-pulse" : ""}
      aria-hidden="true"
    >
      <path d="M12 3 L13.5 10.5 L21 12 L13.5 13.5 L12 21 L10.5 13.5 L3 12 L10.5 10.5 Z" />
    </svg>
  );
}

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
          className={`fixed z-50 flex items-center gap-1 rounded-lg border border-bg-tertiary bg-bg-secondary px-1.5 py-1 shadow-xl shadow-black/40 backdrop-blur-sm ${
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
                className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
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
