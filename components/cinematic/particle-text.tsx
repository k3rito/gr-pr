"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

type ParticleTextProps = {
  text: string;
  progress: number;
  y?: number;
  fontSize?: number;
  spread?: number;
};

const hashFloat32 = (data: Float32Array) => {
  let hash = 2166136261;
  for (let i = 0; i < data.length; i += 3) {
    hash ^= Math.floor(data[i] * 1000);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const createSeededRandom = (seed: number) => {
  let t = seed + 0x6d2b79f5;
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

function sampleTextPoints(text: string, fontSize: number, spread: number): Float32Array {
  const canvas = document.createElement("canvas");
  const size = 1024;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new Float32Array();

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${fontSize}px Georgia, serif`;
  ctx.fillText(text, size / 2, size / 2);

  const { data } = ctx.getImageData(0, 0, size, size);
  const points: number[] = [];

  for (let y = 0; y < size; y += 4) {
    for (let x = 0; x < size; x += 4) {
      const alpha = data[(y * size + x) * 4 + 3];
      if (alpha > 120) {
        const px = (x / size - 0.5) * spread;
        const py = (0.5 - y / size) * (spread * 0.35);
        points.push(px, py, 0);
      }
    }
  }

  return new Float32Array(points);
}

export function ParticleText({
  text,
  progress,
  y = -1.35,
  fontSize = 220,
  spread = 5.2,
}: ParticleTextProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const targets = useMemo(() => sampleTextPoints(text, fontSize, spread), [fontSize, spread, text]);
  const origins = useMemo(() => {
    const arr = new Float32Array(targets.length);
    if (!targets.length) return arr;
    const rand = createSeededRandom(hashFloat32(targets));
    for (let i = 0; i < targets.length; i += 3) {
      arr[i] = (rand() - 0.5) * 8;
      arr[i + 1] = (rand() - 0.5) * 5;
      arr[i + 2] = (rand() - 0.5) * 4;
    }
    return arr;
  }, [targets]);

  const positions = useMemo(() => new Float32Array(targets), [targets]);

  useEffect(() => {
    const geometry = pointsRef.current?.geometry as THREE.BufferGeometry | undefined;
    if (!geometry) return;
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  }, [positions]);

  useFrame(() => {
    const geometry = pointsRef.current?.geometry as THREE.BufferGeometry | undefined;
    if (!geometry) return;

    const attr = geometry.getAttribute("position") as THREE.BufferAttribute;
    const eased = progress * progress * (3 - 2 * progress);

    for (let i = 0; i < attr.count; i++) {
      const i3 = i * 3;
      attr.setXYZ(
        i,
        THREE.MathUtils.lerp(origins[i3], targets[i3], eased),
        THREE.MathUtils.lerp(origins[i3 + 1], targets[i3 + 1], eased) + y,
        THREE.MathUtils.lerp(origins[i3 + 2], targets[i3 + 2], eased),
      );
    }
    attr.needsUpdate = true;
  });

  if (!targets.length) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry />
      <pointsMaterial
        color="#f2dfb2"
        size={0.045}
        transparent
        opacity={0.95}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
