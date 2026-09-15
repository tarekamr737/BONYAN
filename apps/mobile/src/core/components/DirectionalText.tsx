import { createContext, useContext } from "react";
import { StyleSheet, Text, type TextProps } from "react-native";

export const LanguageDirection = createContext(false);
export function DirectionalText({style, ...props}: TextProps) {
  const arabic = useContext(LanguageDirection);
  const declared = StyleSheet.flatten(style);
  return <Text {...props} style={[style, {
    textAlign: declared?.textAlign ?? (arabic ? "right" : "left"),
    writingDirection: declared?.writingDirection ?? (arabic ? "rtl" : "ltr"),
  }]} />;
}
