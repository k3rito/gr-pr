"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CINEMATIC_SECTIONS,
  type CinematicSection,
} from "@/lib/cinematic-types";

type UseSectionNavigationOptions = {
  enabled: boolean;
  onAdvance?: (from: CinematicSection, to: CinematicSection) => void;
  shouldAdvance?: (section: CinematicSection) => boolean;
};

export function useSectionNavigation({
  enabled,
  onAdvance,
  shouldAdvance,
}: UseSectionNavigationOptions) {
  const [section, setSection] = useState<CinematicSection>("consent");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const lockRef = useRef(false);
  const touchStartY = useRef<number | null>(null);

  const goTo = useCallback(
    (next: CinematicSection) => {
      if (lockRef.current || next === section) return;
      lockRef.current = true;
      setIsTransitioning(true);

      onAdvance?.(section, next);

      window.setTimeout(() => {
        setSection(next);
        window.setTimeout(() => {
          setIsTransitioning(false);
          lockRef.current = false;
        }, 900);
      }, 700);
    },
    [onAdvance, section],
  );

  const advance = useCallback(() => {
    const index = CINEMATIC_SECTIONS.indexOf(section);
    if (index >= CINEMATIC_SECTIONS.length - 1) return;
    goTo(CINEMATIC_SECTIONS[index + 1]);
  }, [goTo, section]);

  useEffect(() => {
    if (!enabled) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (Math.abs(event.deltaY) < 18) return;
      if (event.deltaY > 0 && (shouldAdvance?.(section) ?? true)) advance();
    };

    const onTouchStart = (event: TouchEvent) => {
      touchStartY.current = event.touches[0]?.clientY ?? null;
    };

    const onTouchEnd = (event: TouchEvent) => {
      const startY = touchStartY.current;
      const endY = event.changedTouches[0]?.clientY;
      touchStartY.current = null;
      if (startY == null || endY == null) return;
      if (startY - endY > 48 && (shouldAdvance?.(section) ?? true)) advance();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") {
        event.preventDefault();
        if (shouldAdvance?.(section) ?? true) advance();
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [advance, enabled, section, shouldAdvance]);

  return {
    section,
    isTransitioning,
    advance,
    goTo,
  };
}
