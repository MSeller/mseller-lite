import React from "react";
import { Image, ImageStyle, StyleProp } from "react-native";
import { useTheme } from "react-native-paper";

const LOGO_ON_LIGHT = require("../../assets/images/mseller-logo-dark.png");
const LOGO_ON_DARK = require("../../assets/images/mseller-logo-light.png");

interface MSellerLogoProps {
  style?: StyleProp<ImageStyle>;
  /** Forces the white-text version, for surfaces that are dark in every theme. */
  onDark?: boolean;
}

/** MSeller wordmark; the white-text version on a dark theme so the text stays readable. */
const MSellerLogo: React.FC<MSellerLogoProps> = ({ style, onDark }) => {
  const { dark } = useTheme();

  return (
    <Image
      source={onDark || dark ? LOGO_ON_DARK : LOGO_ON_LIGHT}
      style={style}
      resizeMode="contain"
      accessibilityLabel="MSeller"
    />
  );
};

export default MSellerLogo;
