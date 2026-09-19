import { StatusBar } from "expo-status-bar";
import React from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator } from "react-native-paper";
import { getTheme } from "../../constants/Theme";
import MSellerLogo from "../common/MSellerLogo";

// The launch screen is dark in every system theme (app.config.js), so this screen is too.
const { colors } = getTheme(true);

/** Follows the launch screen — same logo, same background — while the saved session and profile load. */
const LoadingScreen: React.FC = () => {
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <MSellerLogo onDark style={styles.logo} />
      <ActivityIndicator
        style={styles.spinner}
        size="small"
        color={colors.primary}
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
