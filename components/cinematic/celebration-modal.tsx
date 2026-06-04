"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

type CelebrationModalProps = {
  open: boolean;
  onClose: () => void;
};

export function CelebrationModal({ open, onClose }: CelebrationModalProps) {
  const fullText = "انا فخور بك يا سكر لقد فعلتها";
  const [typed, setTyped] = useState("");
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      window.setTimeout(() => setTyped(""), 0);
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
      return;
    }

    let index = 0;
    window.setTimeout(() => setTyped(""), 0);

    const tick = () => {
      index += 1;
      setTyped(fullText.slice(0, index));
      if (index < fullText.length) {
        timerRef.current = window.setTimeout(tick, 140);
      }
    };

    timerRef.current = window.setTimeout(tick, 360);
    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    };
  }, [fullText, open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="absolute inset-0 bg-black/65 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            role="dialog"
            aria-modal
            className="relative max-w-xl rounded-3xl border border-[#d8b26e]/35 bg-[#120f0b]/90 px-10 py-12 text-center shadow-[0_0_80px_rgba(216,178,110,0.25)]"
            initial={{ opacity: 0, scale: 0.9, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            onClick={(event) => event.stopPropagation()}
          >
            <p className="gold-glow text-2xl leading-relaxed text-[#f8e8c8] md:text-3xl" dir="rtl" lang="ar">
              {typed}
              {typed.length < fullText.length ? (
                <span className="caret ml-1 inline-block h-6 w-[2px] bg-[#d8b26e]" />
              ) : null}
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
