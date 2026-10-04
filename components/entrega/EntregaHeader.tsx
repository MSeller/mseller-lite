import React from "react";
import { StyleSheet } from "react-native";
import { Appbar, useTheme } from "react-native-paper";

import type { CustomTheme } from "@/constants/Theme";
import { useTranslation } from "@/hooks/useTranslation";

interface Props {
  title: string;
  onBack: () => void;
  /** Plain tinted `Appbar.Action`s on the right. */
  children?: React.ReactNode;
}

/**
 * The header of the delivery screens. Rendered by each screen inside its top-edge SafeAreaView,
 * so `statusBarHeight={0}` keeps the status bar inset from being added twice.
 */
export function EntregaHeader({ title, onBack, children }: Props) {
  const theme = useTheme() as CustomTheme;
  const { colors, type } = theme.custom;
  const { t } = useTranslation();
  return (
    <Appbar.Header statusBarHeight={0} mode="small" style={{ backgroundColor: colors.background }}>
      <Appbar.BackAction onPress={onBack} color={colors.tint} accessibilityLabel={t("common.back")} />
      <Appbar.Content title={title} titleStyle={[styles.title, type.rowTitle]} />
      {children}
    </Appbar.Header>
  );
}

const styles = StyleSheet.create({
  title: { textAlign: "left" },
});
