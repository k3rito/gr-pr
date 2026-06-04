"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Lenis from "@studio-freight/lenis";
import { AmbientParticles } from "@/components/cinematic/ambient-particles";
import { CelebrationModal } from "@/components/cinematic/celebration-modal";
import { HatScreen } from "@/components/cinematic/hat-screen";
import { MusicConsentScreen } from "@/components/cinematic/music-consent-screen";
import { PoemScreen } from "@/components/cinematic/poem-screen";
import { SectionTransition } from "@/components/cinematic/section-transition";
import { YearsScreen } from "@/components/cinematic/years-screen";
import { useSectionNavigation } from "@/hooks/use-section-navigation";
import { audioEngine } from "@/lib/audio-engine";
import type { CinematicSection } from "@/lib/cinematic-types";

export default function CinematicExperience() {
  const [audioReady, setAudioReady] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const lenisRef = useRef<Lenis | null>(null);

  const onAdvance = useCallback((from: CinematicSection, to: CinematicSection) => {
    if (from === "consent" && to === "years") {
      audioEngine.stopSound1();
    }
  }, []);

  const { section, isTransitioning } = useSectionNavigation({
    enabled: audioReady,
    onAdvance,
  });

  const started = audioReady;

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.35,
      smoothWheel: true,
      touchMultiplier: 1.1,
    });
    lenisRef.current = lenis;

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  useEffect(() => {
    return () => audioEngine.dispose();
  }, []);

  const handleStart = async () => {
    await audioEngine.initFromGesture();
    await audioEngine.playSound1();
    setAudioReady(true);
  };

  const visible = useMemo(
    () => ({
      consent: section === "consent",
      years: section === "years",
      hat: section === "hat",
      poem: section === "poem",
    }),
    [section],
  );

  return (
    <main className="cinematic-bg grain-overlay relative h-dvh w-full overflow-hidden">
      <AmbientParticles intensity={section === "poem" ? 1.15 : 0.9} />
      <SectionTransition active={isTransitioning} />

      <div className="relative h-full w-full">
        {visible.consent ? <MusicConsentScreen visible onStart={handleStart} /> : null}
        {visible.years ? <YearsScreen visible active={started} /> : null}
        {visible.hat ? <HatScreen visible active={started} /> : null}
        {visible.poem ? (
          <PoemScreen visible active={started} forceTypewriter onOpenModal={() => setModalOpen(true)} />
        ) : null}
      </div>

      <CelebrationModal open={modalOpen} onClose={() => setModalOpen(false)} />

      {audioReady && section !== "poem" ? (
        <p className="pointer-events-none absolute bottom-6 left-1/2 z-50 -translate-x-1/2 text-xs tracking-[0.3em] text-[#b7a17a]/70 uppercase">
          Scroll to continue
        </p>
      ) : null}
    </main>
  );
}
