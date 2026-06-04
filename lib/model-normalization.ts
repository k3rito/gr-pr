import * as THREE from "three";

type MeshInfo = {
  mesh: THREE.Mesh;
  maxDim: number;
  minDim: number;
  flatness: number;
  volume: number;
  name: string;
};

export type NormalizedModelResult = {
  object: THREE.Object3D;
  originalSize: THREE.Vector3;
  size: THREE.Vector3;
  scale: number;
};

const BACKGROUND_NAME_PATTERN =
  /background|backdrop|floor|ground|wall|plane|sky|skybox|environment|env|studio|room|card|image|panel|stage|platform/i;

const getMeshInfo = (mesh: THREE.Mesh): MeshInfo | null => {
  const box = new THREE.Box3().setFromObject(mesh);
  if (box.isEmpty()) return null;
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const minDim = Math.min(size.x, size.y, size.z);
  if (!Number.isFinite(maxDim) || maxDim <= 0) return null;

  const name = `${mesh.name} ${mesh.parent?.name ?? ""}`.trim().toLowerCase();
  return {
    mesh,
    maxDim,
    minDim,
    flatness: minDim / maxDim,
    volume: size.x * size.y * size.z,
    name,
  };
};

const hideBackgroundMeshes = (root: THREE.Object3D) => {
  const infos: MeshInfo[] = [];
  root.updateMatrixWorld(true);

  root.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    const mesh = child as THREE.Mesh;
    const info = getMeshInfo(mesh);
    if (info) infos.push(info);
  });

  if (!infos.length) return;

  const volumetric = infos.filter((info) => info.flatness > 0.06);
  const referenceSource = volumetric.length ? volumetric : infos;
  const referenceMax = Math.max(...referenceSource.map((info) => info.maxDim));
  const referenceVolume = Math.max(...referenceSource.map((info) => info.volume));

  infos.forEach((info) => {
    const nameHit = BACKGROUND_NAME_PATTERN.test(info.name);
    const isFlat = info.flatness < 0.035;
    const isHuge = info.maxDim > referenceMax * 1.6;
    const isWidePlane = isFlat && info.maxDim > referenceMax * 1.2;
    const volumeRatio = referenceVolume > 0 ? info.volume / referenceVolume : 0;
    const isDecorative = isHuge && volumeRatio > 1.2;

    if (nameHit || isWidePlane || (isFlat && isHuge) || isDecorative) {
      info.mesh.visible = false;
      info.mesh.castShadow = false;
      info.mesh.receiveShadow = false;
    }
  });
};

export function normalizeModel(object: THREE.Object3D, targetHeight: number): NormalizedModelResult {
  const root = object;

  hideBackgroundMeshes(root);
  root.updateMatrixWorld(true);

  const originalBox = new THREE.Box3().setFromObject(root);
  const originalSize = originalBox.getSize(new THREE.Vector3());
  if (!Number.isFinite(originalSize.y) || originalSize.y <= 0) {
    return {
      object: root,
      originalSize,
      size: originalSize.clone(),
      scale: 1,
    };
  }

  const scale = targetHeight / originalSize.y;
  root.scale.setScalar(scale);
  root.updateMatrixWorld(true);

  const scaledBox = new THREE.Box3().setFromObject(root);
  const center = scaledBox.getCenter(new THREE.Vector3());
  root.position.sub(center);
  root.updateMatrixWorld(true);

  const centeredBox = new THREE.Box3().setFromObject(root);
  root.position.y -= centeredBox.min.y;
  root.updateMatrixWorld(true);

  const finalBox = new THREE.Box3().setFromObject(root);
  const finalSize = finalBox.getSize(new THREE.Vector3());

  return {
    object: root,
    originalSize,
    size: finalSize,
    scale,
  };
}
