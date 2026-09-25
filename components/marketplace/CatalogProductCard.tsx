import { Image } from "expo-image";
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Icon, IconButton, Text, useTheme } from "react-native-paper";

import type { CustomTheme } from "../../constants/Theme";
import { useTranslation } from "../../hooks/useTranslation";
import type { ProductoCatalogo } from "../../types/b2b";
import { formatMoney, formatQuantity, formatUnitWithFactor } from "../../utils/documentFormat";
import { remoteImageUrl } from "../../utils/remoteImage";
import AppCard from "../ui/AppCard";

interface Props {
  producto: ProductoCatalogo;
  /** Units of this product already in the cart, shown on the add button. */
  enCarrito: number;
  onPress: () => void;
  onAdd: () => void;
}

/**
 * One product in the catalogue grid.
 *
 * An unavailable product is shown and marked, never hidden: the buyer needs to know the
 * supplier carries it — a colmado plans its order around what it usually buys — and a
 * product that silently disappears reads as a catalogue that lost it.
 */
const CatalogProductCard: React.FC<Props> = ({ producto, enCarrito, onPress, onAdd }) => {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const unitLabel = formatUnitWithFactor(producto.unidad, producto.factor);
  const imagenUri = remoteImageUrl(producto.imagenUrl);

  return (
    <AppCard style={styles.card} onPress={onPress} contentStyle={styles.pressable}>
      <View>
        <View style={[styles.imageWrap, !producto.disponible && styles.imageWrapDimmed]}>
          {imagenUri ? (
            <Image
              source={{ uri: imagenUri }}
              style={styles.image}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Icon source="image-off-outline" size={28} color={theme.colors.onSurfaceVariant} />
            </View>
          )}

          {producto.promocion && (
            <View style={[styles.badge, styles.promoBadge]}>
              <Text variant="labelSmall" style={styles.promoText}>
                {t("marketplace.promo")}
              </Text>
            </View>
          )}

          {!producto.disponible && (
            <View style={[styles.badge, styles.unavailableBadge]}>
              <Text variant="labelSmall" style={styles.unavailableText}>
                {t("marketplace.outOfStock")}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          <Text variant="bodyMedium" style={styles.name} numberOfLines={2}>
            {producto.nombre || producto.codigo}
          </Text>
          <Text variant="bodySmall" style={styles.meta} numberOfLines={1}>
            {producto.codigo}
            {unitLabel ? ` · ${unitLabel}` : ""}
          </Text>

          <View style={styles.priceRow}>
            {producto.precioOculto ? (
              <Text variant="bodySmall" style={styles.priceHidden} numberOfLines={2}>
                {t("marketplace.priceHiddenLabel")}
              </Text>
            ) : (
              <Text variant="titleMedium" style={styles.price}>
                {formatMoney(producto.precio ?? 0)}
              </Text>
            )}
            <View style={styles.addWrap}>
              {enCarrito > 0 && (
                <View style={styles.inCartPill}>
                  <Text variant="labelMedium" style={styles.inCartText}>
                    {formatQuantity(enCarrito)}
                  </Text>
                </View>
              )}
              {/*
                Tapping this when the buyer has no active link still calls `onAdd` — the
                screen decides what that means (prompt to redeem a code / request access)
                instead of silently queueing an order it cannot send.
              */}
              <IconButton
                icon={producto.tieneVinculoActivo ? "plus" : "lock-outline"}
                mode="contained"
                size={18}
                onPress={onAdd}
                style={styles.addButton}
                accessibilityLabel={
                  producto.tieneVinculoActivo
                    ? t("marketplace.addToCart")
                    : t("marketplace.linkRequiredTitle")
                }
              />
            </View>
          </View>
        </View>
      </View>
    </AppCard>
  );
};

const createStyles = (theme: CustomTheme) =>
  StyleSheet.create({
    card: {
      flex: 1,
    },
    pressable: {
      overflow: "hidden",
    },
    imageWrap: {
      height: 120,
      backgroundColor: theme.colors.surfaceVariant,
      borderTopLeftRadius: theme.custom.radius.container,
      borderTopRightRadius: theme.custom.radius.container,
      overflow: "hidden",
    },
    imageWrapDimmed: {
      opacity: 0.55,
    },
    image: {
      width: "100%",
      height: "100%",
    },
    imagePlaceholder: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    badge: {
      position: "absolute",
      top: 8,
      left: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: theme.custom.radius.pill,
    },
    promoBadge: {
      backgroundColor: theme.custom.status.warning.container,
    },
    promoText: {
      color: theme.custom.status.warning.onContainer,
      fontWeight: "700",
    },
    unavailableBadge: {
      // Arriba a la DERECHA, como una insignia más de la imagen. Antes era una franja a
      // todo el ancho pegada al borde inferior, que se leía como un separador entre la
      // foto y el nombre en vez de como un estado del producto.
      left: undefined,
      right: 8,
      backgroundColor: theme.custom.status.negative.container,
    },
    unavailableText: {
      color: theme.custom.status.negative.onContainer,
      fontWeight: "700",
    },
    body: {
      padding: 10,
      gap: 2,
    },
    name: {
      color: theme.colors.onSurface,
      fontWeight: "600",
      minHeight: 38,
    },
    meta: {
      color: theme.colors.onSurfaceVariant,
    },
    priceRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 4,
    },
    price: {
      color: theme.colors.onSurface,
      fontWeight: "700",
      flexShrink: 1,
    },
    priceHidden: {
      color: theme.colors.onSurfaceVariant,
      fontStyle: "italic",
      flexShrink: 1,
    },
    addWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
    },
    inCartPill: {
      // Relleno y con contraste: el número suelto junto al precio se leía como parte del
      // precio, no como "ya llevas 2 de esto".
      minWidth: 24,
      height: 24,
      paddingHorizontal: 6,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primaryContainer,
    },
    inCartText: {
      color: theme.colors.onPrimaryContainer,
      fontWeight: "800",
    },
    addButton: {
      margin: 0,
    },
  });

export default CatalogProductCard;
