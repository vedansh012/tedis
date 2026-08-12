"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { LandingLight } from "@/components/landing/landing-light";
import { LandingDark } from "@/components/landing/landing-dark";

/**
 * Two full landing designs — one for each theme. next-themes with
 * `defaultTheme="system"` resolves the viewer's Chrome/OS preference into
 * `resolvedTheme` after mount; before mount we render the light one so
 * light-mode viewers (the majority) see no flash. Dark viewers get one
 * silent swap on hydration, then stay on the dark landing.
 */
export default function LandingPage() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (mounted && resolvedTheme === "dark") return <LandingDark />;
  return <LandingLight />;
}
