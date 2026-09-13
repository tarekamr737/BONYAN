import { describe, expect, it } from "vitest";

import { prepareNativeAvatarGlb } from "../src/features/avatar/components/prepareNativeAvatarGlb";

const jsonChunkType = 0x4e4f534a;

type MaterialDocument = {
  images?: unknown[];
  materials?: {
    normalTexture?: unknown;
    pbrMetallicRoughness?: {
      baseColorFactor?: number[];
      baseColorTexture?: unknown;
      metallicRoughnessTexture?: unknown;
    };
  }[];
};

function makeGlb(document: MaterialDocument): ArrayBuffer {
  const encoded = new TextEncoder().encode(JSON.stringify(document));
  const chunkLength = Math.ceil(encoded.byteLength / 4) * 4;
  const data = new ArrayBuffer(20 + chunkLength);
  const bytes = new Uint8Array(data);
  const view = new DataView(data);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, data.byteLength, true);
  view.setUint32(12, chunkLength, true);
  view.setUint32(16, jsonChunkType, true);
  bytes.fill(0x20, 20);
  bytes.set(encoded, 20);
  return data;
}

function readDocument(data: ArrayBuffer): MaterialDocument {
  const view = new DataView(data);
  let offset = 12;
  while (offset + 8 <= data.byteLength) {
    const chunkLength = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    if (chunkType === jsonChunkType) {
      const json = new TextDecoder().decode(
        new Uint8Array(data, offset + 8, chunkLength),
      );
      return JSON.parse(json.trim()) as MaterialDocument;
    }
    offset += 8 + chunkLength;
  }
  throw new Error("GLB JSON chunk not found");
}

describe("native avatar GLB preparation", () => {
  it("keeps the binary intact while removing iOS-incompatible texture references", () => {
    const source = makeGlb({
      images: [{ uri: "embedded-texture.png" }],
      materials: [
        {
          normalTexture: { index: 0 },
          pbrMetallicRoughness: {
            baseColorTexture: { index: 0 },
            metallicRoughnessTexture: { index: 0 },
          },
        },
      ],
    });

    const prepared = prepareNativeAvatarGlb(source);
    const document = readDocument(prepared);

    expect(prepared.byteLength).toBe(source.byteLength);
    expect(document.images).toBeUndefined();
    expect(document.materials).not.toHaveLength(0);
    for (const material of document.materials ?? []) {
      expect(material.normalTexture).toBeUndefined();
      expect(material.pbrMetallicRoughness?.baseColorTexture).toBeUndefined();
      expect(material.pbrMetallicRoughness?.metallicRoughnessTexture).toBeUndefined();
      expect(material.pbrMetallicRoughness?.baseColorFactor).toHaveLength(4);
    }
  });
});
