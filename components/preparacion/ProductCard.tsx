import React from "react";
import { StyleSheet, View } from "react-native";
import { Button, Icon, Text, useTheme } from "react-native-paper";

import type { CustomTheme } from "@/constants/Theme";
import { useTranslation } from "@/hooks/useTranslation";
import { ConsolidadoProducto } from "../../types/preparacion";
import AppCard from "../ui/AppCard";
import StatusChip from "../ui/StatusChip";

interface ProductCardProps {
  producto: ConsolidadoProducto;
  pickedQty?: number;
  isConfirmed: boolean;
  onConfirm?: () => void;
}

/** Whole numbers without decimals, fractions as sent (a 1.5 KG line stays 1.5). */
const formatQty = (qty: number) =>
  Number.isInteger(qty) ? String(qty) : qty.toLocaleString(undefined, { maximumFractionDigits: 3 });

/**
 * One product to pick. State is carried by the leading tile (package while pending, check once
 * confirmed) and the confirmed badge, not by a coloured edge, so the card stays calm in a long
 * list and the quantity on the right is what the eye lands on.
 */
const ProductCard: React.FC<ProductCardProps> = ({
  producto,
  pickedQty = 0,
  isConfirmed,
  onConfirm,
}) => {
  const theme = useTheme() as CustomTheme;
  const { t } = useTranslation();
  const { status, spacing, radius } = theme.custom;

  const nombre = producto.nombreProducto?.trim();
  const unidad = producto.unidad?.trim();
  const ubicacion = producto.ubicacion?.trim();
  // Some products have no description on the backend; the code is then the title.
  const codigo = nombre ? producto.codigoProducto : null;

  return (
    <AppCard style={styles.card} contentStyle={{ padding: spacing.md }}>
      <View style={styles.row}>
        <View
          style={[
            styles.tile,
            {
              borderRadius: radius.sm,
              backgroundColor: isConfirmed
                ? status.positive.container
                : theme.colors.surfaceVariant,
            },
          ]}
        >
          <Icon
            source={isConfirmed ? "check" : "package-variant-closed"}
            size={22}
            color={isConfirmed ? status.positive.base : theme.colors.onSurfaceVariant}
          />
        </View>

        <View style={styles.info}>
          <Text
            variant="titleMedium"
            numberOfLines={2}
            style={{ color: theme.colors.onSurface }}
          >
            {nombre || producto.codigoProducto}
          </Text>
          {(!!codigo || !!ubicacion) && (
            <View style={styles.metaRow}>
              {!!codigo && (
                <Text
                  variant="bodySmall"
                  numberOfLines={1}
                  style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}
                >
                  {codigo}
                </Text>
              )}
              {!!ubicacion && (
                <View style={styles.location}>
                  <Icon
                    source="map-marker-outline"
                    size={14}
                    color={theme.colors.onSurfaceVariant}
                  />
                  <Text
                    variant="bodySmall"
                    numberOfLines={1}
                    style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}
                  >
                    {ubicacion}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.qty}>
          <Text
            variant="labelSmall"
            style={[styles.qtyLabel, { color: theme.colors.onSurfaceVariant }]}
          >
            {t("preparacion.totalDemand")}
          </Text>
          <Text style={[styles.qtyValue, { color: theme.colors.onSurface }]}>
            {formatQty(producto.cantidadTotal)}
            {!!unidad && (
              <Text style={[styles.qtyUnit, { color: theme.colors.onSurfaceVariant }]}>
                {` ${unidad}`}
              </Text>
            )}
          </Text>
        </View>
      </View>

      {isConfirmed ? (
        <View style={[styles.footer, { marginTop: spacing.md }]}>
          <StatusChip
            tone="positive"
            label={`${t("preparacion.confirmed")} · ${formatQty(pickedQty)}${unidad ? ` ${unidad}` : ""}`}
          />
        </View>
      ) : (
        onConfirm && (
          <Button
            mode="contained"
            onPress={onConfirm}
            icon="clipboard-check-outline"
            style={[styles.confirmBtn, { marginTop: spacing.md, borderRadius: radius.sm }]}
            contentStyle={styles.confirmBtnContent}
            labelStyle={styles.confirmBtnLabel}
          >
            {t("preparacion.confirmProduct")}
          </Button>
        )
      )}
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tile: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 2,
  },
  location: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    flexShrink: 1,
  },
  meta: {
    flexShrink: 1,
    letterSpacing: 0.2,
  },
  qty: {
    alignItems: "flex-end",
  },
  qtyLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  qtyValue: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  qtyUnit: {
    fontSize: 13,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  confirmBtn: {
    alignSelf: "stretch",
  },
  confirmBtnContent: {
    minHeight: 44,
  },
  confirmBtnLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
});

export default ProductCard;
