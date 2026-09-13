import { Buffer } from "buffer";

const glbMagic = 0x46546c67;
const jsonChunkType = 0x4e4f534a;

type GlbMaterial = {
  name?: string;
  normalTexture?: unknown;
  occlusionTexture?: unknown;
  emissiveTexture?: unknown;
  pbrMetallicRoughness?: {
    baseColorFactor?: number[];
    baseColorTexture?: unknown;
    metallicFactor?: number;
    metallicRoughnessTexture?: unknown;
    roughnessFactor?: number;
  };
};

type GlbDocument = {
  images?: unknown[];
  materials?: GlbMaterial[];
  samplers?: unknown[];
  textures?: unknown[];
};

function nativeMaterialColor(name = ""): number[] {
  const normalized = name.toLowerCase();
  if (normalized.includes("body") || normalized.includes("head")) {
    return [0.48, 0.3, 0.22, 1];
  }
  if (normalized.includes("eyeball") || normalized.includes("teeth")) {
    return [0.82, 0.82, 0.78, 1];
  }
  if (normalized.includes("cornea") || normalized.includes("eyelash")) {
    return [0.025, 0.035, 0.04, 1];
  }
  return [0.055, 0.075, 0.085, 1];
}

function removeTextureReferences(material: GlbMaterial) {
  delete material.normalTexture;
  delete material.occlusionTexture;
  delete material.emissiveTexture;

  const pbr = material.pbrMetallicRoughness ?? {};
  delete pbr.baseColorTexture;
  delete pbr.metallicRoughnessTexture;
  pbr.baseColorFactor = nativeMaterialColor(material.name);
  pbr.metallicFactor = 0.05;
  pbr.roughnessFactor = 0.72;
  material.pbrMetallicRoughness = pbr;
}

/**
 * Expo GL currently reaches the bundled model but fails while Three uploads its
 * embedded image textures on iOS. Keep the rig, meshes and proportions intact,
 * and replace only native texture references with stable PBR colors.
 */
export function prepareNativeAvatarGlb(data: ArrayBuffer): ArrayBuffer {
  const bytes = new Uint8Array(data);
  const view = new DataView(data);
  if (bytes.byteLength < 20 || view.getUint32(0, true) !== glbMagic) return data;

  let offset = 12;
  while (offset + 8 <= bytes.byteLength) {
    const chunkLength = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkLength;
    if (chunkEnd > bytes.byteLength) return data;

    if (chunkType === jsonChunkType) {
      const originalJson = Buffer.from(bytes.subarray(chunkStart, chunkEnd))
        .toString("utf8")
        .trim();
      const document = JSON.parse(originalJson) as GlbDocument;
      document.materials?.forEach(removeTextureReferences);
      delete document.images;
      delete document.samplers;
      delete document.textures;

      const nextJson = Buffer.from(JSON.stringify(document), "utf8");
      if (nextJson.byteLength > chunkLength) return data;

      const nextBytes = bytes.slice();
      nextBytes.fill(0x20, chunkStart, chunkEnd);
      nextBytes.set(nextJson, chunkStart);
      return nextBytes.buffer;
    }

    offset = chunkEnd;
  }

  return data;
}
