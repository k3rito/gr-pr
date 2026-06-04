"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { FULL_POEM } from "@/lib/poem-content";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

type PoemScreenProps = {
  visible: boolean;
  active: boolean;
  onOpenModal: () => void;
  forceTypewriter?: boolean;
};

function delayForChar(char: string): number {
  if (char === "\n") return 680;
  if (char === "،" || char === ",") return 520;
  if (char === "." || char === "؟" || char === "!") return 920;
  if (char === " ") return 120;
  return 70 + Math.random() * 90;
}

export function PoemScreen({ visible, active, onOpenModal, forceTypewriter = false }: PoemScreenProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [typed, setTyped] = useState("");
  const [done, setDone] = useState(false);
  const shouldType = useMemo(() => forceTypewriter || !reducedMotion, [forceTypewriter, reducedMotion]);
  const displayText = shouldType ? typed : FULL_POEM;
  const isDone = shouldType ? done : true;

  const paragraphs = useMemo(() => displayText.split("\n\n"), [displayText]);

  useEffect(() => {
    if (!visible || !active) return;

    if (!shouldType) return;

    let index = 0;
    let cancelled = false;
    const resetTimer = window.setTimeout(() => {
      if (cancelled) return;
      setTyped("");
      setDone(false);
    }, 0);

    const tick = () => {
      if (cancelled) return;
      if (index >= FULL_POEM.length) {
        setDone(true);
        return;
      }

      const nextChar = FULL_POEM[index];
      index += 1;
      setTyped((value) => value + nextChar);
      window.setTimeout(tick, delayForChar(nextChar));
    };

    const starter = window.setTimeout(tick, 700);
    return () => {
      cancelled = true;
      window.clearTimeout(starter);
      window.clearTimeout(resetTimer);
    };
  }, [active, shouldType, visible]);

  return (
    <motion.section
      className="section-shell overflow-hidden"
      initial={false}
      animate={{
        opacity: visible ? 1 : 0,
        filter: visible ? "blur(0px)" : "blur(10px)",
      }}
      transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
      aria-hidden={!visible}
    >
      <div className="relative z-10 flex h-full w-full max-w-4xl flex-col items-center justify-center gap-8 px-4 py-10 md:px-8">
        <div
          dir="rtl"
          lang="ar"
          className="gold-glow max-h-[62vh] overflow-y-auto px-2 text-right text-[1.05rem] leading-[2.2] text-[#f4e6ca] md:text-[1.2rem]"
        >
          {paragraphs.map((paragraph, index) => (
            <motion.p
              key={`${index}-${paragraph.slice(0, 12)}`}
              className="mb-5 whitespace-pre-wrap"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: paragraph ? 1 : 0, y: paragraph ? 0 : 8 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              {paragraph}
            </motion.p>
          ))}
          {!isDone ? <span className="caret ml-1 inline-block h-5 w-[2px] bg-[#d8b26e]" /> : null}
        </div>

        <AnimatePresence>
          {isDone ? (
            <motion.button
              type="button"
              onClick={onOpenModal}
              className="rounded-full border border-[#d8b26e]/50 bg-[#15120d]/75 px-10 py-3 text-lg text-[#f8e8c8] backdrop-blur-md"
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              اضغطي على الهايك
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
