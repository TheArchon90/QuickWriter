import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Shared UI primitives for the Claude-powered floating popups
 * (SelectionPopup, InsertPopup). Keeps the visual language consistent
 * across both without duplicating JSX.
 */

// Fixed particle trajectories for the success burst. Exactly 6 — more feels
// noisy, fewer feels sparse. Used by both popups' ParticleBurst.
export const PARTICLES = [
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
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center font-mono text-[9px] px-1 py-0.5 rounded bg-bg-tertiary/60 text-text-muted border border-bg-tertiary/70 tracking-tight">
      {children}
    </span>
  );
}

/**
 * One-shot sparkle burst that plays when an AI action succeeds. Each mount
 * animates six accent-colored dots outward from the popup center, rotating
 * and fading. Driven by a key change from the parent — no internal state.
 * Container and particles are pointer-events-none so the popup stays clickable.
 */
export function ParticleBurst() {
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
export function Sparkle({ pulsing }: { pulsing: boolean }) {
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
