"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera, useGLTF } from "@react-three/drei";
import { motion } from "framer-motion";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { audioEngine } from "@/lib/audio-engine";
import { normalizeModel } from "@/lib/model-normalization";

type HatScreenProps = {
  visible: boolean;
  active: boolean;
};

const HAT_MODEL_URL = "/models/graduation_hat.glb";
const GOWN_MODEL_URL = "/models/gown.glb";

const ENTRY_DURATION_SECONDS = 3;
const ROTATION_SPEED_RADIANS = THREE.MathUtils.degToRad(6.5);
const ROTATION_SPEED_RADIANS_LOW = THREE.MathUtils.degToRad(5);
const GAP_PX = 4;
const TARGET_HEIGHT = 2.8;
const CAMERA_PADDING = 1.12;
const GOWN_TARGET_HEIGHT = 2;
const CAP_WIDTH_MIN = 0.45;
const CAP_WIDTH_MAX = 0.6;
const CAP_WIDTH_FACTOR = 0.26;
const MODEL_SCALE_REDUCTION = 0.85;

const smoothstep = (value: number) => value * value * (3 - 2 * value);

const collectTextures = (material: THREE.Material): THREE.Texture[] => {
  const textures: THREE.Texture[] = [];
  const typed = material as THREE.MeshStandardMaterial & {
    aoMap?: THREE.Texture;
  };

  [
    typed.map,
    typed.normalMap,
    typed.roughnessMap,
    typed.metalnessMap,
    typed.emissiveMap,
    typed.aoMap,
  ].forEach((texture) => {
    if (texture && texture.isTexture) textures.push(texture);
  });

  return textures;
};

const enhanceMaterial = (material: THREE.Material, maxAnisotropy: number) => {
  if ("metalness" in material && typeof (material as THREE.MeshStandardMaterial).metalness === "number") {
    const current = (material as THREE.MeshStandardMaterial).metalness ?? 0;
    (material as THREE.MeshStandardMaterial).metalness = Math.min(1, Math.max(current, 0.35));
  }

  if ("roughness" in material && typeof (material as THREE.MeshStandardMaterial).roughness === "number") {
    const current = (material as THREE.MeshStandardMaterial).roughness ?? 1;
    (material as THREE.MeshStandardMaterial).roughness = Math.max(0.18, Math.min(current, 0.62));
  }

  if ("envMapIntensity" in material && typeof (material as THREE.MeshStandardMaterial).envMapIntensity === "number") {
    const current = (material as THREE.MeshStandardMaterial).envMapIntensity ?? 1;
    (material as THREE.MeshStandardMaterial).envMapIntensity = Math.max(current, 0.85);
  }

  collectTextures(material).forEach((texture) => {
    texture.anisotropy = Math.min(maxAnisotropy, 12);
  });

  material.needsUpdate = true;
};

const disposeObject = (object: THREE.Object3D) => {
  object.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    mesh.geometry?.dispose();
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(material)) {
      material.forEach((mat) => mat.dispose());
    } else {
      material?.dispose();
    }
  });
};

const formatVector = (vector: THREE.Vector3) =>
  `${vector.x.toFixed(2)}x${vector.y.toFixed(2)}x${vector.z.toFixed(2)}`;

const logNormalization = (
  label: string,
  originalSize: THREE.Vector3,
  finalSize: THREE.Vector3,
  scale: number,
) => {
  console.info(
    `[normalizeModel] ${label} original=${formatVector(originalSize)} final=${formatVector(finalSize)} scale=${scale.toFixed(3)}`,
  );
};

const prepareModel = (scene: THREE.Object3D, maxAnisotropy: number, targetHeight: number) => {
  const clone = scene.clone(true);
  const materials: THREE.Material[] = [];
  clone.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = true;

    const material = mesh.material as THREE.Material | THREE.Material[];
    if (Array.isArray(material)) {
      const cloned = material.map((mat) => mat.clone());
      mesh.material = cloned;
      cloned.forEach((mat) => {
        mat.userData.baseOpacity = typeof mat.opacity === "number" ? mat.opacity : 1;
        mat.transparent = true;
        enhanceMaterial(mat, maxAnisotropy);
        materials.push(mat);
      });
    } else if (material) {
      const cloned = material.clone();
      mesh.material = cloned;
      cloned.userData.baseOpacity = typeof cloned.opacity === "number" ? cloned.opacity : 1;
      cloned.transparent = true;
      enhanceMaterial(cloned, maxAnisotropy);
      materials.push(cloned);
    }
  });

  const normalized = normalizeModel(clone, targetHeight);

  return { object: normalized.object, size: normalized.size, materials, scale: normalized.scale, originalSize: normalized.originalSize };
};

function GraduationOutfit({
  settled,
  lowPerf,
  visible,
  cameraRef,
}: {
  settled: boolean;
  lowPerf: boolean;
  visible: boolean;
  cameraRef: { current: THREE.PerspectiveCamera | null };
}) {
  const groupRef = useRef<THREE.Group>(null);
  const hatRef = useRef<THREE.Group>(null);
  const gownRef = useRef<THREE.Group>(null);
  const basePosition = useRef(new THREE.Vector3());
  const entryOffset = useRef(0.2);
  const entryStart = useRef<number | null>(null);

  const { size, gl } = useThree();
  const maxAnisotropy = useMemo(() => gl.capabilities.getMaxAnisotropy?.() ?? 1, [gl]);

  const hat = useGLTF(HAT_MODEL_URL);
  const gown = useGLTF(GOWN_MODEL_URL);

  const { hatData, gownData } = useMemo(() => {
    const gownModel = prepareModel(gown.scene, maxAnisotropy, GOWN_TARGET_HEIGHT);
    const hatModel = prepareModel(hat.scene, maxAnisotropy, GOWN_TARGET_HEIGHT);

    const capTargetWidth = THREE.MathUtils.clamp(
      gownModel.size.y * CAP_WIDTH_FACTOR,
      CAP_WIDTH_MIN,
      CAP_WIDTH_MAX,
    );
    const hatWidth = Math.max(hatModel.size.x, hatModel.size.z);
    const widthScale = hatWidth > 0 ? capTargetWidth / hatWidth : 1;
    if (Math.abs(widthScale - 1) > 0.001) {
      hatModel.object.scale.multiplyScalar(widthScale);
      hatModel.object.updateMatrixWorld(true);
      const hatBox = new THREE.Box3().setFromObject(hatModel.object);
      hatModel.size = hatBox.getSize(new THREE.Vector3());
      hatModel.scale *= widthScale;
    }

    logNormalization("Gown", gownModel.originalSize, gownModel.size, gownModel.scale);
    logNormalization("Cap", hatModel.originalSize, hatModel.size, hatModel.scale);

    return { hatData: hatModel, gownData: gownModel };
  }, [gown.scene, hat.scene, maxAnisotropy]);

  const allMaterials = useMemo(
    () => [...hatData.materials, ...gownData.materials],
    [gownData.materials, hatData.materials],
  );

  useLayoutEffect(() => {
    if (!groupRef.current || !hatRef.current || !gownRef.current) return;
    const camera = cameraRef.current;
    if (!camera) return;
    if (!size.width || !size.height) return;

    camera.fov = 32;
    camera.aspect = size.width / size.height;
    camera.updateProjectionMatrix();

    const fitDistance = (boxSize: THREE.Vector3) => {
      const fov = THREE.MathUtils.degToRad(camera.fov);
      const fitHeightDistance = (boxSize.y / 2) / Math.tan(fov / 2);
      const fitWidthDistance = (boxSize.x / 2) / Math.tan(fov / 2) / camera.aspect;
      return Math.max(fitHeightDistance, fitWidthDistance) * CAMERA_PADDING;
    };

    const applyLayout = (gapWorld: number) => {
      if (!groupRef.current || !hatRef.current || !gownRef.current) return new THREE.Vector3();

      groupRef.current.position.set(0, 0, 0);
      groupRef.current.scale.setScalar(1);
      groupRef.current.rotation.set(0, 0, 0);

      gownRef.current.position.set(0, 0, 0);
      hatRef.current.position.set(0, 0, 0);

      gownRef.current.updateMatrixWorld(true);
      hatRef.current.updateMatrixWorld(true);

      const gownBox = new THREE.Box3().setFromObject(gownRef.current);
      const hatBox = new THREE.Box3().setFromObject(hatRef.current);
      const gownTop = gownBox.max.y;
      const hatBottom = hatBox.min.y;
      const gownCenter = gownBox.getCenter(new THREE.Vector3());
      const hatCenter = hatBox.getCenter(new THREE.Vector3());
      const offsetX = gownCenter.x - hatCenter.x;
      const offsetZ = gownCenter.z - hatCenter.z;
      const offsetY = gownTop - hatBottom + gapWorld;

      hatRef.current.position.set(offsetX, offsetY, offsetZ);
      groupRef.current.updateMatrixWorld(true);

      const box = new THREE.Box3().setFromObject(groupRef.current);
      const center = box.getCenter(new THREE.Vector3());
      groupRef.current.position.sub(center);

      const sizeVec = box.getSize(new THREE.Vector3());
      const scale = TARGET_HEIGHT / sizeVec.y;
      groupRef.current.scale.setScalar(scale * MODEL_SCALE_REDUCTION);

      const scaledSize = sizeVec.clone().multiplyScalar(scale);
      basePosition.current.copy(groupRef.current.position);
      entryOffset.current = Math.max(0.12 * MODEL_SCALE_REDUCTION, scaledSize.y * 0.06 * MODEL_SCALE_REDUCTION);

      return scaledSize;
    };

    const firstSize = applyLayout(0);
    const distanceOne = fitDistance(firstSize);

    const fov = THREE.MathUtils.degToRad(camera.fov);
    const worldPerPixel = (2 * Math.tan(fov / 2) * distanceOne) / size.height;
    const gapWorld = worldPerPixel * GAP_PX;

    const finalSize = applyLayout(gapWorld);
    const distanceTwo = fitDistance(finalSize);

    camera.position.set(0, 0, distanceTwo);
    camera.near = Math.max(0.01, distanceTwo / 100);
    camera.far = distanceTwo * 100;
    camera.updateProjectionMatrix();
    camera.lookAt(0, 0, 0);
  }, [cameraRef, gownData.size, hatData.size, size.height, size.width]);

  useEffect(() => {
    return () => {
      disposeObject(hatData.object);
      disposeObject(gownData.object);
    };
  }, [gownData.object, hatData.object]);

  useEffect(() => {
    if (!visible) {
      entryStart.current = null;
      if (groupRef.current) {
        groupRef.current.rotation.set(0, 0, 0);
      }
    }
  }, [visible]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group || !visible) return;

    if (entryStart.current == null) {
      entryStart.current = state.clock.elapsedTime;
    }

    const elapsed = state.clock.elapsedTime - entryStart.current;
    const progress = Math.min(elapsed / ENTRY_DURATION_SECONDS, 1);
    const eased = smoothstep(progress);
    group.position.set(
      basePosition.current.x,
      THREE.MathUtils.lerp(basePosition.current.y - entryOffset.current, basePosition.current.y, eased),
      basePosition.current.z,
    );

    allMaterials.forEach((material) => {
      const baseOpacity = typeof material.userData.baseOpacity === "number" ? material.userData.baseOpacity : 1;
      material.opacity = baseOpacity * eased;
    });

    if (progress >= 1 && settled) {
      const speed = lowPerf ? ROTATION_SPEED_RADIANS_LOW : ROTATION_SPEED_RADIANS;
      group.rotation.y += delta * speed;
    }
  });

  return (
    <group ref={groupRef}>
      <group ref={gownRef}>
        <primitive object={gownData.object} />
      </group>
      <group ref={hatRef}>
        <primitive object={hatData.object} />
      </group>
    </group>
  );
}

function HatCanvas({ settled, lowPerf, visible }: { settled: boolean; lowPerf: boolean; visible: boolean }) {
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  return (
    <div
      className="relative"
      style={{ width: "min(78vw, 68vh)", height: "min(78vw, 68vh)" }}
    >
      <Canvas
        shadows
        dpr={lowPerf ? 1.2 : [1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.1;
          gl.outputColorSpace = THREE.SRGBColorSpace;
          // @ts-ignore
          gl.physicallyCorrectLights = true;
        }}
      >
        <PerspectiveCamera ref={cameraRef} makeDefault fov={32} position={[0, 0, 4]} />
        <ambientLight intensity={0.5} color="#f5e9cf" />
        <directionalLight
          position={[3.8, 4.2, 5]}
          intensity={1.4}
          color="#fdf2d4"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-bias={-0.00008}
        />
        <directionalLight position={[-3.2, 2.4, 2.6]} intensity={0.7} color="#b9a27a" />
        <directionalLight position={[0, 3.6, -4.4]} intensity={0.95} color="#d8b26e" />
        <directionalLight position={[0, -2.8, 3.8]} intensity={0.35} color="#8a7348" />
        <Suspense fallback={null}>
          <GraduationOutfit settled={settled} lowPerf={lowPerf} visible={visible} cameraRef={cameraRef} />
        </Suspense>
      </Canvas>
    </div>
  );
}

export function HatScreen({ visible, active }: HatScreenProps) {
  const [displayText, setDisplayText] = useState("");
  const [settled, setSettled] = useState(false);
  const typingTimer = useRef<number | null>(null);
  const startDelayTimer = useRef<number | null>(null);
  const soundStartedRef = useRef(false);
  const fullText = "Masara";
  const lowPerf = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    const cores = navigator.hardwareConcurrency ?? 4;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
    const userAgent = navigator.userAgent || "";
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(userAgent);
    return isMobile || cores <= 4 || memory <= 4;
  }, []);

  useEffect(() => {
    if (!visible || !active) return;
    if (soundStartedRef.current) return;
    soundStartedRef.current = true;
    void audioEngine.playSound2Loop();
  }, [active, visible]);

  useEffect(() => {
    if (!visible) {
      if (typingTimer.current != null) window.clearTimeout(typingTimer.current);
      if (startDelayTimer.current != null) window.clearTimeout(startDelayTimer.current);
      window.setTimeout(() => {
        setDisplayText("");
        setSettled(false);
      }, 0);
      return;
    }

    if (!settled) return;

    let index = 0;
    window.setTimeout(() => setDisplayText(""), 0);

    const tick = () => {
      index += 1;
      setDisplayText(fullText.slice(0, index));
      if (index < fullText.length) {
        typingTimer.current = window.setTimeout(tick, 220);
      }
    };

    startDelayTimer.current = window.setTimeout(tick, 360);

    return () => {
      if (typingTimer.current != null) window.clearTimeout(typingTimer.current);
      if (startDelayTimer.current != null) window.clearTimeout(startDelayTimer.current);
    };
  }, [fullText, settled, visible]);

  return (
    <motion.section
      className="section-shell flex items-center justify-center"
      initial={false}
      animate={{
        opacity: visible ? 1 : 0,
        filter: visible ? "blur(0px)" : "blur(12px)",
      }}
      transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
      aria-hidden={!visible}
    >
      {visible ? (
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, scale: 0.92, y: 36 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: ENTRY_DURATION_SECONDS, ease: [0.22, 1, 0.36, 1] }}
          onAnimationComplete={() => {
            if (visible) setSettled(true);
          }}
        >
          <div className="flex flex-col items-center gap-4">
            <HatCanvas settled={settled} lowPerf={lowPerf} visible={visible} />
          </div>

          <div className="mt-6 flex justify-center" aria-hidden={!visible}>
            <span className="masara-type select-none" aria-live="polite">
              {displayText}
            </span>
            {displayText.length < fullText.length ? (
              <span className="caret ml-1 inline-block h-5 w-[2px] bg-[#d8b26e]" />
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </motion.section>
  );
}
