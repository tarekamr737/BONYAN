/* eslint-disable react/no-unknown-property -- React Three Fiber JSX uses Three.js props. */
import { useFrame, useLoader } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Box3, Group, Vector3 } from "three";
import type { Mesh, Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

import type { AvatarPresentation, BodyShapeProfile } from "../types";

type AvatarBody3DProps = {
  presentation: AvatarPresentation;
  reduceMotion: boolean;
  rotation: number;
  shape: BodyShapeProfile;
  onReady?: () => void;
};

const bodyWidths: Record<BodyShapeProfile, { depth: number; width: number }> = {
  skinny: { depth: 0.87, width: 0.89 },
  slim: { depth: 0.94, width: 0.95 },
  normal: { depth: 1, width: 1 },
  fit: { depth: 1.04, width: 1.055 },
  strong: { depth: 1.09, width: 1.11 },
  full: { depth: 1.06, width: 1.05 },
};

function shapeFullBody(mesh: Mesh, modelBounds: Box3) {
  const geometry = mesh.geometry.clone();
  const positions = geometry.attributes.position;
  if (!positions) return;
  const height = Math.max(modelBounds.max.y - modelBounds.min.y, 0.001);

  for (let index = 0; index < positions.count; index += 1) {
    const heightRatio = (positions.getY(index) - modelBounds.min.y) / height;
    const belly = Math.exp(-Math.pow((heightRatio - 0.58) / 0.15, 2));
    const hips = Math.exp(-Math.pow((heightRatio - 0.45) / 0.13, 2));
    const thighs = Math.exp(-Math.pow((heightRatio - 0.32) / 0.16, 2));
    const widthScale = 1.04 + belly * 0.22 + hips * 0.2 + thighs * 0.08;
    const depthScale = 1.06 + belly * 0.32 + hips * 0.24 + thighs * 0.08;

    positions.setX(index, positions.getX(index) * widthScale);
    positions.setZ(index, positions.getZ(index) * depthScale);
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  mesh.geometry = geometry;
}

const modelUrls: Record<AvatarPresentation, string> = {
  men: process.env.EXPO_PUBLIC_AVATAR_MEN_MODEL_URL || "/avatar-3d/man.glb",
  women: process.env.EXPO_PUBLIC_AVATAR_WOMEN_MODEL_URL || "/avatar-3d/woman.glb",
};

export function AvatarBody3D({
  onReady,
  presentation,
  reduceMotion,
  rotation,
  shape,
}: AvatarBody3DProps) {
  const root = useRef<Group>(null);
  const gltf = useLoader(GLTFLoader, modelUrls[presentation]);
  const scene = useMemo(() => {
    const next = clone(gltf.scene);
    const width = bodyWidths[shape];
    const modelBounds = new Box3().setFromObject(next);

    next.traverse((object: Object3D) => {
      if ("isMesh" in object && object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
        object.frustumCulled = false;
      }

      if (object.name === "AvatarBody" || object.name.startsWith("outfit")) {
        object.scale.x *= width.width;
        object.scale.z *= width.depth;
        if (shape === "full" && "geometry" in object) {
          shapeFullBody(object as Mesh, modelBounds);
        }
      }
    });

    // MetaPerson samples ship in a T-pose. Lower the rigged arms into a relaxed,
    // game-avatar stance while keeping the model fully skinned and rotatable.
    const leftArm = next.getObjectByName("LeftArm");
    const rightArm = next.getObjectByName("RightArm");
    if (leftArm) leftArm.rotation.x += 1.23;
    if (rightArm) rightArm.rotation.x += 1.23;

    return next;
  }, [gltf.scene, shape]);
  const modelScale = useMemo(() => {
    const size = new Vector3();
    new Box3().setFromObject(scene).getSize(size);
    return 4.85 / size.y;
  }, [scene]);
  useEffect(() => {
    onReady?.();
  }, [onReady, scene]);
  useFrame(({ clock }) => {
    if (!root.current) return;
    root.current.rotation.y = rotation;
    root.current.position.y = -2.31 + (reduceMotion ? 0 : Math.sin(clock.elapsedTime * 1.45) * 0.008);
  });

  return (
    <group ref={root} position={[0, -2.31, 0]}>
      <primitive object={scene} scale={modelScale} />
    </group>
  );
}
