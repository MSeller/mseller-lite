import React from "react";
import { StyleSheet, View } from "react-native";
import {
  Button,
  Chip,
  Icon,
  Text,
  useTheme,
} from "react-native-paper";
import { useTranslation } from "@/hooks/useTranslation";
import { ConsolidadoProducto } from "../../types/preparacion";

interface ProductCardProps {
  producto: ConsolidadoProducto;
  pickedQty?: number;
  isConfirmed: boolean;
  onConfirm?: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  producto,
  pickedQty = 0,
  isConfirmed,
  onConfirm,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const hasQty = pickedQty > 0;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          opacity: isConfirmed ? 0.6 : 1,
          borderLeftColor: isConfirmed
            ? "#1F6B54"
            : hasQty
              ? theme.colors.primary
              : "#E0E0E0",
        },
      ]}
    >
      <View style={styles.mainRow}>
        {/* Status indicator */}
        {isConfirmed && (
          <View style={[styles.statusIcon, { backgroundColor: "#1F6B54" }]}>
            <Icon source="check" size={20} color="#fff" />
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {/* Top row: location + confirmed badge */}
          <View style={styles.topRow}>
            {producto.ubicacion ? (
              <Chip compact style={styles.locationChip} textStyle={styles.locationChipText}>
                {producto.ubicacion}
              </Chip>
            ) : (
              <View />
            )}
            {isConfirmed && (
              <Chip compact style={styles.confirmedChip} textStyle={styles.confirmedChipText}>
                {`${t("preparacion.confirmed")} · ${pickedQty}`}
              </Chip>
            )}
          </View>

          {/* Product code — prominent */}
          <Text
            variant="titleMedium"
            style={[styles.productCode, { color: theme.colors.primary }]}
            numberOfLines={1}
          >
            {producto.codigoProducto}
          </Text>

          {/* Product name — large */}
          <Text
            variant="bodyLarge"
            style={[styles.productName, { color: theme.colors.onSurface }]}
            numberOfLines={2}
          >
            {producto.nombreProducto}
          </Text>

          {/* Demand row */}
          <View style={styles.demandRow}>
            <View style={styles.demandItem}>
              <Text variant="labelSmall" style={[styles.demandLabel, { color: theme.colors.onSurfaceVariant }]}>
                {t("preparacion.totalDemand")}
              </Text>
              <Text style={[styles.demandValue, { color: theme.colors.onSurface }]}>
                {String(producto.cantidadTotal).padStart(2, "0")}
                <Text style={styles.demandUnit}> {producto.unidad ?? ""}</Text>
              </Text>
            </View>
          </View>

          {/* Confirm button — navigates to confirmation screen */}
          {!isConfirmed && onConfirm && (
            <Button
              mode="contained"
              onPress={onConfirm}
              icon="clipboard-check-outline"
              style={[styles.confirmBtn, { backgroundColor: theme.colors.primary }]}
              labelStyle={styles.confirmBtnLabel}
            >
              {t("preparacion.confirmProduct")}
            </Button>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 16,
    borderLeftWidth: 4,
    overflow: "hidden",
  },
  mainRow: {
    flexDirection: "row",
    padding: 14,
    gap: 10,
  },
  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  locationChip: {
    backgroundColor: "#DCE7F3",
    height: 24,
  },
  locationChipText: {
    color: "#14395E",
    fontSize: 11,
    fontWeight: "700",
  },
  confirmedChip: {
    backgroundColor: "#D6EDE3",
    height: 24,
  },
  confirmedChipText: {
    color: "#1F6B54",
    fontWeight: "700",
    fontSize: 11,
  },
  productCode: {
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  productName: {
    fontWeight: "600",
    lineHeight: 22,
    marginTop: 2,
  },
  demandRow: {
    flexDirection: "row",
    marginTop: 10,
    gap: 16,
  },
  demandItem: {},
  demandLabel: {
    fontWeight: "700",
    letterSpacing: 0.5,
    fontSize: 10,
    textTransform: "uppercase",
  },
  demandValue: {
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 28,
  },
  demandUnit: {
    fontSize: 14,
    fontWeight: "500",
  },
  confirmBtn: {
    marginTop: 10,
    borderRadius: 20,
  },
  confirmBtnLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
});

export default ProductCard;
