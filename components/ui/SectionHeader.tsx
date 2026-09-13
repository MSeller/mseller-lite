import React from "react";
import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

import type { CustomTheme } from "../../constants/Theme";

interface Props {
  title: string;
  /** Optional right-hand element — a count, a link, an action. */
  trailing?: React.ReactNode;
}

/**
 * A section label above a group of content.
 *
 * Small, uppercase and quiet on purpose. Section titles set large and in the
 * brand colour — the pattern this replaces — compete with the content they are
 * introducing and make every screen read as a stack of equally loud boxes. The
 * hierarchy should come from the content, not from the labels.
 */
const SectionHeader: React.FC<Props> = ({ title, trailing }) => {
  const theme = useTheme() as CustomTheme;

  return (
    <View style={styles.row}>
      <Text
        variant="labelMedium"
        style={[styles.title, { color: theme.colors.onSurfaceVariant }]}
      >
        {title.toUpperCase()}
      </Text>
      {trailing}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 10,
    marginTop: 4,
  },
  title: {
    letterSpacing: 0.8,
    fontWeight: "700",
  },
});

export default SectionHeader;
