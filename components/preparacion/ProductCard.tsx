import React, { useMemo } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { Icon, Text, useTheme } from "react-native-paper";

import { gutterFor, type CustomTheme } from "@/constants/Theme";
import { useTranslation } from "@/hooks/useTranslation";
import { ConsolidadoProducto } from "../../types/preparacion";

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
 * One product to pick, as a full-bleed row: name and where to find it on the left, the
 * quantity to take on the right. Done is a green check in place of the package icon and a
 * confirmed line under the figure — not a tinted row — so a long list stays calm and the
 * quantity is what the eye lands on. Tapping a pending row opens the confirm screen.
 */
const ProductCard: React.FC<ProductCardProps> = ({
  producto,
  pickedQty = 0,
  isConfirmed,
  onConfirm,
}) => {
  const theme = useTheme() as CustomTheme;
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme, gutterFor(width)), [theme, width]);
  const { t } = useTranslation();
  const { colors, status } = theme.custom;

  const nombre = producto.nombreProducto?.trim();
  const unidad = producto.unidad?.trim();
  const ubicacion = producto.ubicacion?.trim();
  // Some products have no description on the backend; the code is then the title.
  const codigo = nombre ? producto.codigoProducto : null;
  const total = `${formatQty(producto.cantidadTotal)}${unidad ? ` ${unidad}` : ""}`;
  const picked = `${formatQty(pickedQty)}${unidad ? ` ${unidad}` : ""}`;
  const pressable = !isConfirmed && !!onConfirm;

  const summary = [
    nombre || producto.codigoProducto,
    codigo,
    ubicacion,
    `${t("preparacion.totalDemand")} ${total}`,
    isConfirmed ? `${t("preparacion.confirmed")} ${picked}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Pressable
      onPress={onConfirm}
      disabled={!pressable}
      accessibilityRole={pressable ? "button" : undefined}
      accessibilityLabel={summary}
      accessibilityHint={pressable ? t("preparacion.ui.confirmProductHint") : undefined}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Icon
        source={isConfirmed ? "check-circle" : "package-variant-closed"}
        size={24}
        color={isConfirmed ? status.positive.base : colors.inkTertiary}
      />

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {nombre || producto.codigoProducto}
        </Text>
        {(!!codigo || !!ubicacion) && (
          <View style={styles.metaRow}>
            {!!codigo && (
              <Text style={styles.meta} numberOfLines={1}>
                {codigo}
              </Text>
            )}
            {!!ubicacion && (
              <View style={styles.location}>
                <Icon source="map-marker-outline" size={14} color={colors.inkTertiary} />
                <Text style={styles.meta} numberOfLines={1}>
                  {ubicacion}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      <View style={styles.qty}>
        <Text style={styles.qtyValue}>
          {formatQty(producto.cantidadTotal)}
          {!!unidad && <Text style={styles.qtyUnit}>{` ${unidad}`}</Text>}
        </Text>
        {isConfirmed ? (
          <Text style={styles.confirmed} numberOfLines={1}>
            {`${t("preparacion.confirmed")} · ${picked}`}
          </Text>
        ) : (
          <Text style={styles.qtyLabel} numberOfLines={1}>
            {t("preparacion.totalDemand")}
          </Text>
        )}
      </View>

      {pressable && <Icon source="chevron-right" size={22} color={colors.tint} />}
    </Pressable>
  );
};

const createStyles = (theme: CustomTheme, gutter: number) => {
  const { colors, spacing, type, hairline, status } = theme.custom;
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: gutter,
      paddingVertical: spacing.md,
      minHeight: 64,
      backgroundColor: colors.background,
      borderBottomWidth: hairline,
      borderBottomColor: colors.hairline,
    },
    pressed: {
      backgroundColor: colors.fill,
    },
    info: {
      flex: 1,
      minWidth: 0,
    },
    name: {
      ...type.rowTitle,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      marginTop: spacing.xs / 2,
    },
    location: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs / 2,
      flexShrink: 1,
    },
    meta: {
      ...type.caption,
      flexShrink: 1,
    },
    qty: {
      alignItems: "flex-end",
      maxWidth: "40%",
    },
    qtyValue: {
      ...type.figure(22),
    },
    qtyUnit: {
      ...type.caption,
      fontWeight: "600",
    },
    qtyLabel: {
      ...type.overline,
    },
    confirmed: {
      ...type.caption,
      fontWeight: "600",
      color: status.positive.base,
    },
  });
};

export default ProductCard;
