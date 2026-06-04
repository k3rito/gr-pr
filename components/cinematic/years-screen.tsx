"use client";

import { motion, useAnimationFrame } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

type YearsScreenProps = {
  visible: boolean;
  active: boolean;
};

const START_YEAR = 2018;
const END_YEAR = 2026;
const YEARS_SOUND_DURATION_MS = 18000;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function OdometerDigit({
  value,
  height,
}: {
  value: number;
  height: number;
}) {
  const digits = useMemo(() => Array.from({ length: 10 }, (_, i) => i), []);

  return (
    <div
      className="relative overflow-hidden"
      style={{ height, width: height * 0.62 }}
    >
      <motion.div
        className="absolute left-0 w-full"
        animate={{ y: -value * height }}
        transition={{ type: "spring", stiffness: 90, damping: 30, mass: 1.2 }}
      >
        {digits.map((digit) => (
          <div
            key={digit}
            className="flex items-center justify-center font-light text-[#f7edd4]"
            style={{ height, fontSize: height * 0.92, lineHeight: 1 }}
          >
            {digit}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

export function YearsScreen({ visible, active }: YearsScreenProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [year, setYear] = useState(START_YEAR);
  const startTimeRef = useRef<number | null>(null);

  const digitHeight = 120;

  useAnimationFrame((time) => {
    if (!active || !visible || reducedMotion) return;

    if (startTimeRef.current == null) {
      startTimeRef.current = time;
    }

    const progress = Math.min(1, (time - startTimeRef.current) / YEARS_SOUND_DURATION_MS);
    const eased = easeInOutCubic(progress);
    const nextYear = Math.round(START_YEAR + (END_YEAR - START_YEAR) * eased);
    setYear(nextYear);
  });

  useEffect(() => {
    if (!active || reducedMotion) return;
    startTimeRef.current = null;
  }, [active, reducedMotion]);

  const displayYear = visible && reducedMotion ? END_YEAR : year;
  const digits = String(displayYear).padStart(4, "0").split("").map(Number);

  return (
    <motion.section
      className="section-shell"
      initial={false}
      animate={{
        opacity: visible ? 1 : 0,
        scale: visible ? 1 : 1.03,
        filter: visible ? "blur(0px)" : "blur(12px)",
      }}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      aria-hidden={!visible}
    >
      <div className="relative z-10 flex flex-col items-center gap-8">
        <p className="text-sm tracking-[0.35em] text-[#c8a96a]/75 uppercase">
          Years of dedication
        </p>
        <div className="gold-glow flex items-center gap-3 md:gap-5">
          {digits.map((digit, index) => (
            <OdometerDigit key={`${index}-${digit}`} value={digit} height={digitHeight} />
          ))}
        </div>
        <p className="text-lg text-[#d9c39a]/85">من {START_YEAR} إلى {END_YEAR}</p>
      </div>
    </motion.section>
  );
}
