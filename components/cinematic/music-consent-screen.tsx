"use client";

import { motion } from "framer-motion";
import gsap from "gsap";
import { useEffect, useRef } from "react";

type MusicConsentScreenProps = {
  onStart: () => void;
  visible: boolean;
};

export function MusicConsentScreen({ onStart, visible }: MusicConsentScreenProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!visible || !buttonRef.current) return;
    const tween = gsap.fromTo(
      buttonRef.current,
      { boxShadow: "0 0 0 rgba(216,178,110,0)" },
      {
        boxShadow: "0 0 42px rgba(216,178,110,0.35)",
        duration: 2.4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      },
    );
    return () => {
      tween.kill();
    };
  }, [visible]);

  return (
    <motion.section
      className="section-shell grain-overlay"
      initial={false}
      animate={{
        opacity: visible ? 1 : 0,
        scale: visible ? 1 : 1.04,
        filter: visible ? "blur(0px)" : "blur(14px)",
      }}
      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      aria-hidden={!visible}
    >
      <div className="relative z-10 flex max-w-3xl flex-col items-center gap-10 text-center">
        <motion.p
          className="text-sm tracking-[0.45em] text-[#c8a96a]/80 uppercase"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 12 }}
          transition={{ delay: 0.2, duration: 1 }}
        >
          Cinematic Memory
        </motion.p>

        <motion.h1
          className="gold-glow text-4xl leading-relaxed font-light text-[#f6ead2] md:text-6xl"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 24 }}
          transition={{ delay: 0.35, duration: 1.1 }}
        >
          لحظة تخرّجٍ تُروى بالضوء والصوت
        </motion.h1>

        <motion.button
          ref={buttonRef}
          type="button"
          onClick={onStart}
          className="group relative overflow-hidden rounded-full border border-[#d8b26e]/45 bg-[#120f0a]/70 px-12 py-4 text-xl text-[#f8e8c8] backdrop-blur-md transition-transform duration-500 hover:scale-[1.03] md:text-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 20 }}
          transition={{ delay: 0.55, duration: 1 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-[#d8b26e]/20 to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
          ولعي الهايك
        </motion.button>

        <p className="text-sm text-[#b9a27b]/80">مرّري للأسفل بعد البدء للمتابعة</p>
      </div>
    </motion.section>
  );
}
