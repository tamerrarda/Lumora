"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Buttery smooth scroll (Lenis) that drives the whole page.
 * Framer Motion's `useScroll` reads native scroll position, which Lenis keeps
 * in sync — so scroll-linked parallax/reveals just work on top of this.
 *
 * Robustness notes:
 *  - Respects prefers-reduced-motion (leaves native scroll intact).
 *  - Disabled on coarse pointers (phones/tablets): native momentum scroll is
 *    smoother there and avoids the intermittent scroll-lock we saw on touch.
 *  - The rAF loop is crash-proof: a single throw from lenis.raf() must never
 *    stop the loop, otherwise scrolling would freeze until a full page reload.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    if (reduceMotion || coarsePointer) return;

    const lenis = new Lenis({
      duration: 1.05,
      // easeOutExpo — quick to respond, long gentle settle
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    let raf = 0;
    let alive = true;
    const loop = (time: number) => {
      if (!alive) return;
      // Never let a single throw kill the loop — that would freeze scrolling
      // permanently until the user reloads the page.
      try {
        lenis.raf(time);
      } catch {
        /* swallow and keep scrolling on the next frame */
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    // Recompute scroll bounds when the viewport changes so scrolling can't get
    // stuck against a stale limit (Lenis also observes content height itself).
    const onResize = () => {
      try {
        lenis.resize();
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      lenis.destroy();
    };
  }, []);

  return null;
}
