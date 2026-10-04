import React from "react";
import { Appbar, useTheme } from "react-native-paper";

import type { CustomTheme } from "../../constants/Theme";
import { useTranslation } from "../../hooks/useTranslation";

interface Props {
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

/**
 * The header's back button: a tinted chevron, like iOS.
 *
 * Paper's `Appbar.BackAction` draws its iOS chevron from a bundled PNG instead of the icon
 * font, and that image did not render in the app — the button kept its space but showed
 * nothing, leaving screens with no visible way out. The icon font every other header action
 * uses always renders.
 */
const HeaderBackAction: React.FC<Props> = ({ onPress, disabled, accessibilityLabel }) => {
  const theme = useTheme() as CustomTheme;
  const { t } = useTranslation();
  return (
    <Appbar.Action
      icon="chevron-left"
      size={30}
      color={theme.custom.colors.tint}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel ?? t("common.back")}
    />
  );
};

export default HeaderBackAction;
