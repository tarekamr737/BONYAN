import type { PropsWithChildren } from "react";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";

type MotionRevealProps = PropsWithChildren<{
  delay?: number;
}>;

export function MotionReveal({ children, delay = 0 }: MotionRevealProps) {
  const reducedMotion = useReducedMotion();
  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeInDown.duration(220).delay(delay)}
    >
      {children}
    </Animated.View>
  );
}
