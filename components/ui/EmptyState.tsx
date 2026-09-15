import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Icon, Text, useTheme } from "react-native-paper";

interface Props {
  icon: string;
  /** Optional heading above the message. */
  title?: string;
  message: string;
  /** Layout from the container: flex, padding, alignment within the screen. */
  style?: StyleProp<ViewStyle>;
}

/**
 * The icon-and-sentence placeholder for a screen or list with nothing to show: nothing
 * offered for this user type, a locked module, no search results, a missing record.
 */
const EmptyState: React.FC<Props> = ({ icon, title, message, style }) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]}>
      <Icon source={icon} size={56} color={theme.colors.onSurfaceVariant} />
      {!!title && (
        <Text variant="titleMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
          {title}
        </Text>
      )}
      <Text variant="bodyMedium" style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  title: {
    fontWeight: "600",
    textAlign: "center",
  },
  message: {
    textAlign: "center",
  },
});

export default EmptyState;
