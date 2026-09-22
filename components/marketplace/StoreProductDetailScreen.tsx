import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Banner,
  Button,
  Dialog,
  Divider,
  Portal,
  Text,
  useTheme,
} from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import type { CustomTheme } from "../../constants/Theme";
import { useMarketplaceCart } from "../../contexts/MarketplaceCartContext";
import { useTranslation } from "../../hooks/useTranslation";
import { getCatalogProduct } from "../../services/b2bService";
import type { ProductoCatalogoDetalle } from "../../types/b2b";
import { describeB2BError } from "../../utils/b2b";
import { formatMoney, formatUnitWithFactor } from "../../utils/documentFormat";
import AppCard from "../ui/AppCard";
import EmptyState from "../ui/EmptyState";
import StatusChip from "../ui/StatusChip";
import ProductGallery from "./ProductGallery";
import QuantityStepper from "./QuantityStepper";

interface Props {
  tiendaId: string;
  tiendaNombre: string;
  codigoProducto: string;
}

/** One product from a supplier's catalogue, with its gallery and an add-to-cart bar. */
const StoreProductDetailScreen: React.FC<Props> = ({ tiendaId, tiendaNombre, codigoProducto }) => {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cart = useMarketplaceCart();

  const [producto, setProducto] = useState<ProductoCatalogoDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [switchStoreVisible, setSwitchStoreVisible] = useState(false);
  const [accessPromptVisible, setAccessPromptVisible] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProducto(await getCatalogProduct(tiendaId, codigoProducto));
      setError("");
    } catch (e) {
      const failure = describeB2BError(e);
      setError(
        failure.kind === "notFound"
          ? t("marketplace.errors.productNotFound")
          : failure.message || t("marketplace.errors.productFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [tiendaId, codigoProducto, t]);

  useEffect(() => {
    load();
  }, [load]);

  const addToCart = () => {
    if (!producto) return;
    if (!producto.tieneVinculoActivo) {
      setAccessPromptVisible(true);
      return;
    }
    if (!cart.belongsTo(tiendaId)) {
      setSwitchStoreVisible(true);
      return;
    }
    cart.add(tiendaId, tiendaNombre, producto, cantidad);
    goBack();
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else
      router.replace({
        pathname: "/marketplace/[tiendaId]/catalogo",
        params: { tiendaId, nombre: tiendaNombre },
      });
  };

  const unitLabel = producto ? formatUnitWithFactor(producto.unidad, producto.factor) : "";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Appbar.Header mode="small" style={styles.appbar}>
        <Appbar.BackAction onPress={goBack} />
        <Appbar.Content title={producto?.nombre || codigoProducto} />
      </Appbar.Header>

      {!!error && (
        <Banner visible icon="alert-circle-outline" actions={[{ label: t("common.retry"), onPress: load }]}>
          {error}
        </Banner>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : !producto ? (
        error ? null : (
          <View style={styles.center}>
            <EmptyState icon="package-variant" message={t("marketplace.errors.productNotFound")} />
          </View>
        )
      ) : (
        <>
          <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 140 + insets.bottom }]}>
            <ProductGallery imagenes={producto.imagenes ?? []} />

            <View style={styles.headerBlock}>
              <Text variant="titleLarge" style={styles.name}>
                {producto.nombre || producto.codigo}
              </Text>
              <Text variant="bodySmall" style={styles.meta}>
                {producto.codigo}
                {unitLabel ? ` · ${unitLabel}` : ""}
                {producto.empaque ? ` · ${producto.empaque}` : ""}
              </Text>

              <View style={styles.chips}>
                <StatusChip
                  label={producto.disponible ? t("marketplace.inStock") : t("marketplace.outOfStock")}
                  tone={producto.disponible ? "positive" : "negative"}
                />
                {producto.promocion && <StatusChip label={t("marketplace.promo")} tone="warning" />}
              </View>
            </View>

            <AppCard>
              <View style={styles.priceCard}>
                <View style={styles.priceRow}>
                  <Text variant="bodyMedium" style={styles.meta}>
                    {t("marketplace.price")}
                  </Text>
                  {producto.precioOculto ? (
                    <Text variant="bodyMedium" style={styles.priceHiddenValue}>
                      {t("marketplace.priceHiddenLabel")}
                    </Text>
                  ) : (
                    <Text variant="headlineSmall" style={styles.price}>
                      {formatMoney(producto.precio ?? 0)}
                    </Text>
                  )}
                </View>
                {producto.precioOculto && (
                  <Text variant="bodySmall" style={styles.meta}>
                    {t("marketplace.priceHiddenNote")}
                  </Text>
                )}
                {producto.impuesto > 0 && (
                  <>
                    <Divider />
                    <View style={styles.priceRow}>
                      <Text variant="bodyMedium" style={styles.meta}>
                        {t("marketplace.tax")}
                      </Text>
                      <Text variant="bodyMedium" style={styles.value}>
                        {producto.impuesto}%
                      </Text>
                    </View>
                  </>
                )}
                {!!producto.area && (
                  <>
                    <Divider />
                    <View style={styles.priceRow}>
                      <Text variant="bodyMedium" style={styles.meta}>
                        {t("marketplace.area")}
                      </Text>
                      <Text variant="bodyMedium" style={styles.value}>
                        {producto.area}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </AppCard>

            {!!producto.descripcion && (
              <Text variant="bodyMedium" style={styles.description}>
                {producto.descripcion}
              </Text>
            )}

            {!producto.disponible && (
              <Text variant="bodySmall" style={styles.unavailableNote}>
                {t("marketplace.outOfStockNote")}
              </Text>
            )}
          </ScrollView>

          <View style={[styles.bottomBar, { paddingBottom: 12 + insets.bottom }]}>
            <QuantityStepper value={cantidad} onChange={setCantidad} min={1} />
            <Button
              mode="contained"
              icon={producto.tieneVinculoActivo ? "cart-plus" : "lock-outline"}
              onPress={addToCart}
              style={styles.addButton}
              contentStyle={styles.addButtonContent}
            >
              {producto.tieneVinculoActivo
                ? producto.precioOculto
                  ? t("marketplace.addToCart")
                  : t("marketplace.addWithTotal", {
                      total: formatMoney(cantidad * (producto.precio ?? 0)),
                    })
                : t("marketplace.linkRequiredTitle")}
            </Button>
          </View>
        </>
      )}

      <Portal>
        <Dialog visible={switchStoreVisible} onDismiss={() => setSwitchStoreVisible(false)}>
          <Dialog.Title>{t("marketplace.switchStoreTitle")}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              {t("marketplace.switchStoreBody", { tienda: cart.tiendaNombre })}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSwitchStoreVisible(false)}>{t("common.cancel")}</Button>
            <Button
              mode="contained"
              onPress={() => {
                if (producto) cart.add(tiendaId, tiendaNombre, producto, cantidad);
                setSwitchStoreVisible(false);
                goBack();
              }}
            >
              {t("marketplace.switchStoreConfirm")}
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={accessPromptVisible} onDismiss={() => setAccessPromptVisible(false)}>
          <Dialog.Title>{t("marketplace.linkRequiredTitle")}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{t("marketplace.linkRequiredBody")}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAccessPromptVisible(false)}>{t("common.cancel")}</Button>
            <Button
              onPress={() => {
                setAccessPromptVisible(false);
                router.push({ pathname: "/marketplace/solicitar", params: { tiendaId, nombre: tiendaNombre } });
              }}
            >
              {t("marketplace.requestAccess")}
            </Button>
            <Button
              mode="contained"
              onPress={() => {
                setAccessPromptVisible(false);
                router.push({ pathname: "/marketplace/canjear", params: { tiendaId, nombre: tiendaNombre } });
              }}
            >
              {t("marketplace.redeemCode")}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
};

const createStyles = (theme: CustomTheme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    appbar: {
      backgroundColor: theme.colors.background,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
    },
    content: {
      padding: 16,
      gap: 16,
    },
    headerBlock: {
      gap: 4,
    },
    name: {
      color: theme.colors.onSurface,
      fontWeight: "700",
    },
    meta: {
      color: theme.colors.onSurfaceVariant,
    },
    chips: {
      flexDirection: "row",
      gap: 8,
      marginTop: 8,
    },
    priceCard: {
      paddingHorizontal: 14,
      paddingVertical: 4,
    },
    priceRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      gap: 12,
    },
    price: {
      color: theme.colors.onSurface,
      fontWeight: "700",
    },
    priceHiddenValue: {
      color: theme.colors.onSurfaceVariant,
      fontStyle: "italic",
    },
    value: {
      color: theme.colors.onSurface,
      fontWeight: "600",
    },
    description: {
      color: theme.colors.onSurfaceVariant,
    },
    unavailableNote: {
      color: theme.custom.status.negative.base,
    },
    bottomBar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 12,
      backgroundColor: theme.colors.surface,
      borderTopWidth: theme.custom.hairline,
      borderTopColor: theme.colors.outlineVariant,
    },
    addButton: {
      flex: 1,
    },
    addButtonContent: {
      height: 52,
    },
  });

export default StoreProductDetailScreen;
