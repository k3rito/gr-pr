"use client";

import { Environment } from "@react-three/drei";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import {
  Bloom,
  DepthOfField,
  EffectComposer,
  Vignette,
} from "@react-three/postprocessing";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { SVGResult } from "three/examples/jsm/loaders/SVGLoader";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader";

type GraduationHatSceneProps = {
  active: boolean;
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

function createProceduralHat(): THREE.Group {
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.05, 0.12, 48),
    new THREE.MeshStandardMaterial({ color: "#111111", metalness: 0.2, roughness: 0.5 }),
  );
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 0.05, 2.1),
    new THREE.MeshStandardMaterial({ color: "#0d0d0d", metalness: 0.25, roughness: 0.45 }),
  );
  top.position.y = 0.08;
  const group = new THREE.Group();
  group.add(cap, top);
  group.scale.setScalar(1.35);
  group.position.set(0, -0.2, 0);
  return group;
}

function useAdaptiveDpr() {
  const { gl, setDpr } = useThree();

  useEffect(() => {
    const apply = () => {
      const max = Math.min(window.devicePixelRatio || 1, 2);
      const mobile = window.innerWidth < 768;
      const dpr = mobile ? Math.min(max, 1.25) : max;
      setDpr(dpr);
      gl.setPixelRatio(dpr);
    };

    apply();
    let timer = 0;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(apply, 150);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.clearTimeout(timer);
    };
  }, [gl, setDpr]);
}

function sampleMeshPoints(object: THREE.Object3D, targetCount = 2800): Float32Array {
  const positions: THREE.Vector3[] = [];
  object.updateMatrixWorld(true);

  object.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    const geometry = mesh.geometry as THREE.BufferGeometry;
    const pos = geometry.getAttribute("position") as THREE.BufferAttribute;
    if (!pos) return;

    const step = Math.max(1, Math.floor(pos.count / 400));
    const world = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += step) {
      world.fromBufferAttribute(pos, i);
      world.applyMatrix4(mesh.matrixWorld);
      positions.push(world.clone());
    }
  });

  if (!positions.length) return new Float32Array();

  const sampled: THREE.Vector3[] = [];
  for (let i = 0; i < targetCount; i++) {
    sampled.push(positions[Math.floor(Math.random() * positions.length)]);
  }

  const flat = new Float32Array(sampled.length * 3);
  sampled.forEach((vector, index) => {
    flat[index * 3] = vector.x;
    flat[index * 3 + 1] = vector.y;
    flat[index * 3 + 2] = vector.z;
  });
  return flat;
}

function SvgHatParticles({ active }: { active: boolean }) {
  const svg = useLoader(
    SVGLoader,
    "/models/graduation_hat.svg",
  ) as SVGResult;
  const model = useMemo(() => {
    if (!svg.paths.length) return createProceduralHat();

    const group = new THREE.Group();
    svg.paths.forEach((path: THREE.ShapePath) => {
      const shapes = SVGLoader.createShapes(path);
      shapes.forEach((shape: THREE.Shape) => {
        const geometry = new THREE.ShapeGeometry(shape);
        const material = new THREE.MeshStandardMaterial({
          color: path.color || "#e8cf9f",
          side: THREE.DoubleSide,
          metalness: 0.25,
          roughness: 0.45,
        });
        const mesh = new THREE.Mesh(geometry, material);
        group.add(mesh);
      });
    });

    const box = new THREE.Box3().setFromObject(group);
    const center = box.getCenter(new THREE.Vector3());
    group.position.sub(center);
    group.rotation.x = Math.PI;
    group.scale.setScalar(0.02);
    group.position.y = -0.2;
    return group;
  }, [svg.paths]);

  return <HatParticlesCore active={active} model={model} />;
}

function HatParticlesCore({
  active,
  model,
}: {
  active: boolean;
  model: THREE.Object3D;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const revealRef = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });
  const targets = useMemo(() => sampleMeshPoints(model, 3200), [model]);
  const origins = useMemo(() => {
    const arr = new Float32Array(targets.length);
    if (!targets.length) return arr;
    const rand = createSeededRandom(hashFloat32(targets));
    for (let i = 0; i < targets.length; i += 3) {
      arr[i] = (rand() - 0.5) * 7;
      arr[i + 1] = (rand() - 0.5) * 5 + 1.2;
      arr[i + 2] = (rand() - 0.5) * 6;
    }
    return arr;
  }, [targets]);

  useEffect(() => {
    const geometry = pointsRef.current?.geometry as THREE.BufferGeometry | undefined;
    if (!geometry || !targets.length) return;
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(targets), 3));
  }, [targets]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.current.y = (event.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((state, delta) => {
    if (active) {
      revealRef.current = Math.min(1, revealRef.current + delta * 0.14);
    }

    const geometry = pointsRef.current?.geometry as THREE.BufferGeometry | undefined;
    if (!geometry) return;

    const eased = revealRef.current * revealRef.current * (3 - 2 * revealRef.current);
    const attr = geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
    if (!attr) return;

    for (let i = 0; i < attr.count; i++) {
      const i3 = i * 3;
      attr.setXYZ(
        i,
        THREE.MathUtils.lerp(origins[i3], targets[i3], eased),
        THREE.MathUtils.lerp(origins[i3 + 1], targets[i3 + 1], eased),
        THREE.MathUtils.lerp(origins[i3 + 2], targets[i3 + 2], eased),
      );
    }
    attr.needsUpdate = true;

    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.12 + pointer.current.x * 0.18;
      groupRef.current.rotation.x = pointer.current.y * 0.08;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.08;
    }
  });

  if (!targets.length) return null;

  return (
    <group ref={groupRef}>
      <points ref={pointsRef}>
        <bufferGeometry />
        <pointsMaterial
          color="#e8cf9f"
          size={0.03}
          transparent
          opacity={0.92}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

function SceneContent({ active }: { active: boolean }) {
  useAdaptiveDpr();

  return (
    <>
      <color attach="background" args={["#030303"]} />
      <fog attach="fog" args={["#050505", 4, 14]} />
      <ambientLight intensity={0.25} />
      <spotLight position={[4, 6, 3]} intensity={32} angle={0.45} penumbra={0.5} color="#f0d7a2" />
      <spotLight position={[-5, 2, -2]} intensity={12} color="#8f6f3f" />
      <Environment preset="night" />

      <SvgHatParticles active={active} />

      <EffectComposer multisampling={0}>
        <Bloom intensity={0.85} luminanceThreshold={0.2} mipmapBlur />
        <DepthOfField focusDistance={0.02} focalLength={0.015} bokehScale={2.2} />
        <Vignette eskil={false} offset={0.2} darkness={0.85} />
      </EffectComposer>
    </>
  );
}

export function GraduationHatScene({ active }: GraduationHatSceneProps) {
  const [darkness, setDarkness] = useState(1);

  useEffect(() => {
    if (!active) {
      const resetTimer = window.setTimeout(() => setDarkness(1), 0);
      return () => window.clearTimeout(resetTimer);
    }
    const timer = window.setTimeout(() => setDarkness(0.12), 2400);
    return () => window.clearTimeout(timer);
  }, [active]);

  return (
    <div className="relative h-full w-full">
      <div
        className="pointer-events-none absolute inset-0 z-20 bg-black transition-opacity duration-[2400ms] ease-out"
        style={{ opacity: darkness }}
      />
      <Canvas
        className="h-full w-full"
        camera={{ position: [0, 0.4, 5.2], fov: 42 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <Suspense fallback={null}>
          <SceneContent active={active} />
        </Suspense>
      </Canvas>
    </div>
  );
}
