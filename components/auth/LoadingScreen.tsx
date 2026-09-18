import React from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, useTheme } from "react-native-paper";
import { CustomTheme } from "../../constants/Theme";
import MSellerLogo from "../common/MSellerLogo";

/** Follows the launch screen — same logo — while the saved session and profile load. */
const LoadingScreen: React.FC = () => {
  const theme = useTheme() as CustomTheme;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <MSellerLogo style={styles.logo} />
      <ActivityIndicator
        style={styles.spinner}
        size="small"
        color={theme.colors.primary}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 240,
    height: 68,
  },
  spinner: {
    marginTop: 24,
  },
});

export default LoadingScreen;
