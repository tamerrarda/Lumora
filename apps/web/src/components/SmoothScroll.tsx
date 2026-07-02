"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Buttery smooth scroll (Lenis) that drives the whole page.
 * Framer Motion's `useScroll` reads native scroll position, which Lenis keeps
 * in sync — so scroll-linked parallax/reveals just work on top of this.
 * Respects prefers-reduced-motion: bails out and leaves native scroll intact.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const lenis = new Lenis({
      duration: 1.05,
      // easeOutExpo — quick to respond, long gentle settle
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6,
    });

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  return null;
}
