import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "react-native-paper";

import type { CustomTheme } from "../../constants/Theme";

interface Props {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Cast the gradient shadow — true for the summary card and the primary CTA. */
  raised?: boolean;
}

/**
 * The brand gradient (135°, `gradientStart` → `gradientEnd`), iOS `BrandGradientSurface`.
 *
 * Reserved for summary cards and the primary call to action: those are the only
 * elements allowed a shadow, and the only ones that should draw the eye.
 */
const BrandGradient: React.FC<Props> = ({ children, style, raised = false }) => {
  const { custom } = useTheme() as CustomTheme;
  const { colors } = custom;
  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.base,
        { borderRadius: custom.radius.container, borderColor: colors.gradientEdge },
        raised && custom.surface.gradientShadow,
        style,
      ]}
    >
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    overflow: "visible",
  },
});

export default BrandGradient;
