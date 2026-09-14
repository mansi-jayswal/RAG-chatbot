"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect } from "react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * All scroll choreography for the page, in one place.
 *
 * Two rules hold everything together:
 *   - Nothing is hidden by CSS. Every tween is a `from`, so a visitor without
 *     JavaScript — or mid-hydration — sees the finished page, never a blank one.
 *   - Every effect lives inside a `matchMedia` branch. Under reduced motion the
 *     branch simply never runs, so there is no animation to opt out of.
 */
export default function ScrollEffects() {
  // Photos change section heights as they decode; stale trigger positions would
  // fire the reveals at the wrong scroll offsets.
  useEffect(() => {
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    return () => window.removeEventListener("load", refresh);
  }, []);

  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add(
      {
        motion: "(prefers-reduced-motion: no-preference)",
        desktop: "(min-width: 1024px)",
      },
      (context) => {
        const { motion, desktop } = context.conditions as {
          motion: boolean;
          desktop: boolean;
        };
        if (!motion) return;

        // 1. Hero parallax — the photo drifts slower than the page. Its box is
        //    130% tall (see Hero.tsx), so the edge never comes into view.
        const heroPhoto =
          document.querySelector<HTMLElement>("[data-hero-photo]");
        if (heroPhoto?.parentElement) {
          gsap.to(heroPhoto, {
            yPercent: 10,
            ease: "none",
            scrollTrigger: {
              trigger: heroPhoto.parentElement,
              start: "top top",
              end: "bottom top",
              scrub: true,
            },
          });
        }

        // 2. Section reveals.
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
          gsap.from(element, {
            opacity: 0,
            y: 18,
            duration: 0.6,
            ease: "power2.out",
            scrollTrigger: { trigger: element, start: "top 88%" },
          });
        });

        // 3. Destination cards, staggered across the grid.
        const grid = document.querySelector<HTMLElement>("[data-card-grid]");
        const cards = gsap.utils.toArray<HTMLElement>("[data-card-item]");
        if (grid && cards.length > 0) {
          gsap.from(cards, {
            opacity: 0,
            y: 24,
            duration: 0.5,
            ease: "power2.out",
            stagger: 0.04,
            scrollTrigger: { trigger: grid, start: "top 82%" },
          });
        }

        // 4. "How it works" — pinned while the three steps light up in turn.
        //    Desktop only: pinning a full section on a short mobile viewport
        //    fights the browser chrome and steals the scroll.
        const stepsSection = document.querySelector<HTMLElement>(
          "[data-steps-section]",
        );
        const steps = gsap.utils.toArray<HTMLElement>("[data-step]");
        if (desktop && stepsSection && steps.length > 0) {
          ScrollTrigger.create({
            trigger: stepsSection,
            start: "top top+=72",
            end: `+=${steps.length * 200}`,
            pin: true,
            pinSpacing: true,
            anticipatePin: 1,
            onUpdate: (self) => {
              const reached = Math.min(
                steps.length - 1,
                Math.floor(self.progress * steps.length),
              );
              steps.forEach((step, index) =>
                step.toggleAttribute("data-active", index <= reached),
              );
            },
            onLeaveBack: () =>
              steps.forEach((step) => step.removeAttribute("data-active")),
          });
        }
      },
    );

    return () => mm.revert();
  });

  return null;
}
