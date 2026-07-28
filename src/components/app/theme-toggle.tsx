"use client";

import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type ViewTransitionDocument = Document & {
  startViewTransition?: (cb: () => void) => { finished: Promise<void> };
};

/**
 * Light/dark toggle with a premium full-screen theme transition.
 *
 * Uses the View Transitions API: the new theme is revealed by a circle that
 * expands from the toggle button across the whole screen (~0.9s). It runs on the
 * compositor (GPU), doesn't reload, and preserves scroll + app state — the theme
 * class is swapped inside the transition callback while the old frame is held as
 * a snapshot underneath. The animation itself lives in globals.css
 * (::view-transition-*). Falls back to an instant switch when the API is absent
 * or the user prefers reduced motion.
 *
 * Renders after mount to avoid a hydration mismatch on the theme-dependent icon.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  const onToggle = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const next = isDark ? "light" : "dark";
      const doc = document as ViewTransitionDocument;
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // No View Transitions support, or the user prefers reduced motion → just
      // switch. (Reduced-motion also short-circuits the CSS animation as a belt.)
      if (prefersReduced || typeof doc.startViewTransition !== "function") {
        setTheme(next);
        return;
      }

      // Origin = the toggle's centre; the new theme blooms out from here via a
      // compositor transform (transform-origin), so only the coords are needed.
      const rect = e.currentTarget.getBoundingClientRect();
      const root = document.documentElement;
      root.style.setProperty("--theme-x", `${rect.left + rect.width / 2}px`);
      root.style.setProperty("--theme-y", `${rect.top + rect.height / 2}px`);

      doc.startViewTransition(() => {
        // The theme swap forces a one-time full-document style recalc — the only
        // main-thread cost. It's applied synchronously here so the "new" snapshot
        // is correct regardless of next-themes' effect timing; setTheme persists
        // the choice + keeps React state (and the icon) in sync (idempotent).
        // The reveal itself is opacity/transform, so this recalc can't stall it.
        root.classList.remove("light", "dark");
        root.classList.add(next);
        setTheme(next);
      });
    },
    [isDark, setTheme],
  );

  return (
    <button
      onClick={onToggle}
      className="flex min-h-touch min-w-touch items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-secondary/60 hover:text-foreground active:scale-90"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {/* keyed so the incoming icon fades + spins in on toggle */}
      <span key={isDark ? "dark" : "light"} className="inline-flex duration-200 ease-out animate-in fade-in zoom-in-75 spin-in-[20deg]">
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </span>
    </button>
  );
}
