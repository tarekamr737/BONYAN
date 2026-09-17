import { Image, StyleSheet, View } from "react-native";

const logo = require("../../../assets/bonyan-logo.png");

export function BrandMark() {
  return (
    <View accessibilityLabel="BONYAN" accessibilityRole="image" style={styles.container}>
      <Image resizeMode="contain" source={logo} style={styles.logo} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    height: 54,
    justifyContent: "center",
    width: 146,
  },
  logo: {
    height: 46,
    width: 146,
  },
});
