import { Image } from "expo-image";
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

import { remoteImageUrl } from "../../utils/remoteImage";
import type { CustomTheme } from "../../constants/Theme";

interface Props {
  nombre: string;
  logoUrl?: string;
  size?: number;
}

/**
 * A store's logo, or its initials when it has none.
 *
 * Most suppliers on the directory have no logo on day one, and a broken-image glyph
 * repeated down a list reads as a failure rather than as "no logo yet".
 */
const StoreLogo: React.FC<Props> = ({ nombre, logoUrl, size = 52 }) => {
  const uri = remoteImageUrl(logoUrl);
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const shape = { width: size, height: size, borderRadius: theme.custom.radius.control };

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, shape]}
        contentFit="cover"
        transition={150}
      />
    );
  }

  const initials = nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  return (
    <View style={[styles.fallback, shape]}>
      <Text variant="titleMedium" style={styles.initials}>
        {initials || "?"}
      </Text>
    </View>
  );
};

const createStyles = (theme: CustomTheme) =>
  StyleSheet.create({
    image: {
      backgroundColor: theme.colors.surfaceVariant,
    },
    fallback: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primaryContainer,
    },
    initials: {
      color: theme.colors.onPrimaryContainer,
      fontWeight: "700",
    },
  });

export default StoreLogo;
