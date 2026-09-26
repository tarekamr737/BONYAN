import { Image } from "react-native";

const logo = require("../../../assets/images/bonyan-official.jpeg");

export function BrandMark({ size = 92 }: { size?: number }) {
  return (
    <Image
      accessibilityLabel="Bonyan logo"
      accessibilityRole="image"
      resizeMode="contain"
      source={logo}
      style={{ width: size, height: size }}
    />
  );
}
