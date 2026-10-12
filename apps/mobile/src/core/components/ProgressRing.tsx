import Svg, {Circle} from "react-native-svg";
import {View} from "react-native";
import {colors} from "../theme/tokens";

/** Unknown evidence has an empty track, never a made-up progress arc. */
export function ProgressRing({value, size = 76}: {value: number | null; size?: number}) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = value === null ? 0 : Math.min(100, Math.max(0, value)) / 100;
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Svg width={size} height={size}>
    <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.line} strokeWidth={7} fill="none"/>
    {fraction > 0 ? <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.positive} strokeWidth={7} fill="none" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * (1 - fraction)} strokeLinecap="round" rotation={-90} origin={`${size / 2}, ${size / 2}`}/> : null}
  </Svg></View>;
}
