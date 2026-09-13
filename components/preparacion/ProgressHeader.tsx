import React from "react";
import { StyleSheet, View } from "react-native";
import { Chip, ProgressBar, Text, useTheme } from "react-native-paper";
import { useTranslation } from "@/hooks/useTranslation";

interface ProgressHeaderProps {
  totalProductos: number;
  productosPreparados: number;
  noRuta: string;
}

const ProgressHeader: React.FC<ProgressHeaderProps> = ({
  totalProductos,
  productosPreparados,
  noRuta,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const progress =
    totalProductos > 0 ? productosPreparados / totalProductos : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      {/* Route label + live session chip */}
      <View style={styles.topRow}>
        <Text
          variant="labelSmall"
          style={[styles.activeRouteLabel, { color: theme.colors.primary }]}
        >
          {t("preparacion.activeRoute")}
        </Text>
        <Chip
          compact
          icon="circle"
          style={styles.liveChip}
          textStyle={styles.liveChipText}
        >
          {t("preparacion.liveSession")}
        </Chip>
      </View>

      {/* Route number */}
      <Text
        variant="headlineMedium"
        style={[styles.routeNumber, { color: theme.colors.onSurface }]}
        numberOfLines={1}
      >
        {noRuta}
      </Text>

      {/* Progress row */}
      <View style={styles.progressRow}>
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          {t("preparacion.pickingProgress")}
        </Text>
        <Text
          variant="labelLarge"
          style={[styles.progressCount, { color: theme.colors.onSurface }]}
        >
          {t("preparacion.productsPickedOf", {
            picked: productosPreparados,
            total: totalProductos,
          })}
        </Text>
      </View>

      <ProgressBar
        progress={progress}
        color={theme.colors.primary}
        style={styles.progressBar}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    marginBottom: 8,
    borderRadius: 16,
    margin: 12,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  activeRouteLabel: {
    fontWeight: "700",
    letterSpacing: 1,
  },
  liveChip: {
    backgroundColor: "#DCE7F3",
    height: 28,
  },
  liveChipText: {
    color: "#14395E",
    fontSize: 11,
    fontWeight: "700",
  },
  routeNumber: {
    fontWeight: "900",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressCount: {
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
});

export default ProgressHeader;
