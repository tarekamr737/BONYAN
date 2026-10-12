import { createContext, useContext } from "react";
import { Platform, StyleSheet, Text, type TextProps } from "react-native";

export const LanguageDirection = createContext(false);
export function DirectionalText({style, ...props}: TextProps) {
  const arabic = useContext(LanguageDirection);
  const declared = StyleSheet.flatten(style);
  return <Text {...props} style={[style, {
    ...(arabic && Platform.OS === "web" ? {fontFamily: `${declared?.fontFamily ?? "sans-serif"}, Arial, sans-serif`} : {}),
    textAlign: declared?.textAlign ?? (arabic ? "right" : "left"),
    writingDirection: declared?.writingDirection ?? (arabic ? "rtl" : "ltr"),
  }]} />;
}
