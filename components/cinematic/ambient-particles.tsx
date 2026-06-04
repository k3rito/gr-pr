"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

type Particle = {
  x: number;
  y: number;
  z: number;
  size: number;
  speed: number;
  alpha: number;
};

type AmbientParticlesProps = {
  intensity?: number;
};

export function AmbientParticles({ intensity = 1 }: AmbientParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    let particles: Particle[] = [];
    let width = 0;
    let height = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.floor((width * height) / 18000) * intensity;
      particles = Array.from({ length: Math.max(40, count) }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random(),
        size: 0.6 + Math.random() * 2.2,
        speed: 0.08 + Math.random() * 0.35,
        alpha: 0.08 + Math.random() * 0.35,
      }));
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      for (const particle of particles) {
        if (!reducedMotion) {
          particle.y -= particle.speed * (0.4 + particle.z);
          particle.x += Math.sin(time * 0.0003 + particle.z * 10) * 0.08;
          if (particle.y < -8) particle.y = height + 8;
          if (particle.x < -8) particle.x = width + 8;
          if (particle.x > width + 8) particle.x = -8;
        }

        const glow = particle.alpha * (0.6 + particle.z * 0.8);
        ctx.beginPath();
        ctx.fillStyle = `rgba(232, 196, 132, ${glow})`;
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      }

      frame = requestAnimationFrame(draw);
    };

    resize();
    frame = requestAnimationFrame(draw);

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 120);
    };

    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      window.clearTimeout(resizeTimer);
    };
  }, [intensity, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 opacity-80"
      aria-hidden
    />
  );
}
