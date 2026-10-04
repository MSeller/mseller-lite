import React from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import AppButton from "./AppButton";

interface Props {
  label: string;
  icon: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** The primary action of a screen, sized for its pinned footer: a full-height `AppButton`. */
export default function GradientButton({ label, icon, onPress, disabled, loading, style }: Props) {
  return (
    <AppButton
      mode="contained"
      icon={icon}
      onPress={onPress}
      disabled={disabled}
      loading={loading}
      style={style}
      contentStyle={styles.footerHeight}
    >
      {label}
    </AppButton>
  );
}

const styles = StyleSheet.create({
  footerHeight: { minHeight: 52 },
});
