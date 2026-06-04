"use client";

import { AnimatePresence, motion } from "framer-motion";

type SectionTransitionProps = {
  active: boolean;
};

export function SectionTransition({ active }: SectionTransitionProps) {
  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          className="pointer-events-none absolute inset-0 z-40 bg-black"
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 0.82, backdropFilter: "blur(14px)" }}
          exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      ) : null}
    </AnimatePresence>
  );
}
