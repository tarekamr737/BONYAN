import { createContext, useContext } from "react";
import { StyleSheet, Text, type TextProps } from "react-native";

export const LanguageDirection = createContext(false);
export function DirectionalText({style, ...props}: TextProps) {
  const arabic = useContext(LanguageDirection);
  const declared = StyleSheet.flatten(style);
  return <Text {...props} style={[style, {
    ...(arabic ? {fontFamily: declared?.fontFamily?.includes("Bold") || Number(declared?.fontWeight) >= 600 ? declared?.fontFamily?.includes("700") ? "Cairo_700Bold" : "Cairo_600SemiBold" : "Cairo_400Regular", letterSpacing: 0} : {}),
    textAlign: declared?.textAlign ?? (arabic ? "right" : "left"),
    writingDirection: declared?.writingDirection ?? (arabic ? "rtl" : "ltr"),
  }]} />;
}
