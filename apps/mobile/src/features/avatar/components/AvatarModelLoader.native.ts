import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import {
  GLTFLoader,
  type GLTF,
} from "three/examples/jsm/loaders/GLTFLoader.js";

import { prepareNativeAvatarGlb } from "./prepareNativeAvatarGlb";

export class AvatarModelLoader extends GLTFLoader {
  override load(
    url: string,
    onLoad: (gltf: GLTF) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (error: unknown) => void,
  ): void {
    const assetModule = url as unknown;
    if (typeof assetModule !== "number") {
      super.load(url, onLoad, onProgress, onError);
      return;
    }

    void Asset.fromModule(assetModule)
      .downloadAsync()
      .then((asset) => {
        const uri = asset.localUri ?? asset.uri;
        return new File(uri).arrayBuffer();
      })
      .then((data) => this.parse(data, "./", onLoad, onError))
      .catch((error: unknown) => onError?.(error));
  }

  override parse(
    data: ArrayBuffer | string,
    path: string,
    onLoad: (gltf: GLTF) => void,
    onError?: (event: ErrorEvent) => void,
  ): void {
    super.parse(
      typeof data === "string" ? data : prepareNativeAvatarGlb(data),
      path,
      onLoad,
      onError,
    );
  }
}
