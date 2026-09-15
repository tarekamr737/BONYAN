import type { PropsWithChildren } from "react";
import type { ViewProps } from "react-native";
import { GlassSurface } from "./GlassSurface";

export function SurfaceCard({ children, style, ...props }: PropsWithChildren<ViewProps>) {
  return (
    <GlassSurface {...props} style={style}>
      {children}
    </GlassSurface>
  );
}
