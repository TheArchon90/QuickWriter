import { useEffect } from "react";
import { useAppState } from "../context/AppContext";

/**
 * Runtime theme applier. Writes `theme.accentColor` and `theme.fontFamily`
 * from settings onto `document.documentElement` as CSS custom properties.
 *
 * This is necessary because Tailwind 4's `@theme { --color-accent: ... }`
 * block emits a static default at build time. Tailwind-generated utilities
 * like `text-accent`, `bg-accent`, and `border-accent` compile to
 * `var(--color-accent)`, so overriding the custom property at the `:root`
 * level propagates to every utility consumer.
 *
 * The font-family is also written globally as a belt-and-suspenders fallback
 * alongside the per-editor setter in Editor.tsx, so `.cm-editor { font-family:
 * var(--editor-font-family) }` always has a live value to inherit from.
 */
export default function ThemeApplier() {
  const state = useAppState();
  const accentColor = state.settings?.theme.accentColor;
  const fontFamily = state.settings?.theme.fontFamily;

  useEffect(() => {
    if (!accentColor) return;
    document.documentElement.style.setProperty("--color-accent", accentColor);
  }, [accentColor]);

  useEffect(() => {
    if (!fontFamily) return;
    document.documentElement.style.setProperty("--editor-font-family", fontFamily);
  }, [fontFamily]);

  return null;
}
