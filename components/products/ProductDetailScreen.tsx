import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { ActivityIndicator, Appbar, Icon, Text, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { gutterFor, type CustomTheme } from "../../constants/Theme";
import { useTranslation } from "../../hooks/useTranslation";
import { ZebraLabelService } from "../../services/zebraLabelService";
import type { Product } from "../../types/inventory";
import {
  formatDateTime,
  formatMoney,
  formatQuantity,
  productDisplayName,
} from "../../utils/documentFormat";
import StatusChip from "../ui/StatusChip";
import { useBottomTabOverflow } from "../ui/TabBarBackground";
import { stockOf, stockTone } from "../../utils/productStock";
import HeaderBackAction from "../ui/HeaderBackAction";

interface ProductDetailScreenProps {
  product: Product;
  onBack: () => void;
}

interface InfoRow {
  label: string;
  value: string | number | null | undefined;
}

const ProductDetailScreen: React.FC<ProductDetailScreenProps> = ({
  product,
  onBack,
}) => {
  const theme = useTheme() as CustomTheme;
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const gutter = gutterFor(width);
  const styles = useMemo(() => createStyles(theme, gutter), [theme, gutter]);
  const { colors } = theme.custom;
  // iOS draws the tab bar over the screen; this is how much of the bottom it covers.
  const tabOverflow = useBottomTabOverflow();
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);

  const handleCreateLabel = async () => {
    if (!product) return;

    setIsCreatingLabel(true);
    try {
      const printers = await ZebraLabelService.getAvailablePrinters();

      if (printers.length === 0) {
        Alert.alert(
          t("products.detail.label.noPrintersTitle"),
          t("products.detail.label.noPrintersMessage"),
          [{ text: t("products.detail.label.ok") }]
        );
        return;
      }

      // For now, use the first available printer
      // In a production app, you might want to let users choose
      const selectedPrinter = printers[0];

      const zplData = ZebraLabelService.generateProductLabel(product);

      Alert.alert(
        t("inventory.createLabel"),
        t("products.detail.label.confirm", {
          name: product.nombre,
          printer: `${selectedPrinter.type.toUpperCase()}${
            selectedPrinter.address ? ` (${selectedPrinter.address})` : ""
          }`,
        }),
        [
          {
            text: t("common.cancel"),
            style: "cancel",
          },
          {
            text: t("products.detail.label.preview"),
            onPress: () => {
              Alert.alert(t("products.detail.label.previewTitle"), zplData, [
                { text: t("products.detail.label.ok") },
              ]);
            },
          },
          {
            text: t("products.detail.label.print"),
            onPress: async () => {
              const result = await ZebraLabelService.printLabel(
                zplData,
                selectedPrinter
              );

              Alert.alert(
                result.success ? t("common.success") : t("common.error"),
                result.message,
                [{ text: t("products.detail.label.ok") }]
              );
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        t("common.error"),
        error.message || t("products.detail.label.failed"),
        [{ text: t("products.detail.label.ok") }]
      );
    } finally {
      setIsCreatingLabel(false);
    }
  };

  const name = product.nombre ? productDisplayName(product.nombre) : product.codigo;
  const active = product.status !== "I";
  const otherPrices = [
    { level: 2, value: product.precio2 },
    { level: 3, value: product.precio3 },
  ].filter((price) => (price.value ?? 0) > 0);
  // A product registered a moment ago has no per-location rows yet; its main warehouse stands in.
  const locations = product.existencias ?? [];
  const showStock = locations.length > 0 || !product.esServicio;
  const info: InfoRow[] = [
    { label: t("products.detail.code"), value: product.codigo },
    { label: t("products.detail.barcode"), value: product.codigoBarra },
    { label: t("products.detail.area"), value: product.area },
    { label: t("products.detail.department"), value: product.departamento },
    { label: t("products.detail.unit"), value: product.unidad },
    { label: t("products.detail.package"), value: product.empaque },
  ];

  const renderStockRow = (key: string | number, label: string, value: number, updated?: string, first = false) => (
    <View
      key={key}
      style={styles.row}
      accessible
      accessibilityLabel={`${label}, ${t("documents.stockShort", { value: formatQuantity(value) })}`}
    >
      {!first && <View style={styles.separator} />}
      <View style={styles.rowContent}>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle} numberOfLines={2}>
            {label}
          </Text>
          {!!updated && (
            <Text style={styles.caption}>{t("products.detail.updated", { date: updated })}</Text>
          )}
        </View>
        <StatusChip label={formatQuantity(value)} tone={stockTone(value)} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Appbar.Header statusBarHeight={0} mode="small" style={styles.appbar}>
        <HeaderBackAction onPress={onBack} accessibilityLabel={t("common.back")} />
        <Appbar.Content title="" />
      </Appbar.Header>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: theme.custom.spacing.xxl + tabOverflow }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.overline} selectable>
            {t("products.detail.codeOverline", { code: product.codigo })}
          </Text>
          <Text style={styles.largeTitle} accessibilityRole="header" selectable>
            {name}
          </Text>
          {!!product.descripcion && <Text style={styles.description}>{product.descripcion}</Text>}
          <View style={styles.chips}>
            <StatusChip
              label={active ? t("catalog.active") : t("catalog.inactive")}
              tone={active ? "positive" : "negative"}
            />
            {product.promocion && <StatusChip label={t("products.detail.promotion")} tone="accent" />}
            {product.esServicio && <StatusChip label={t("products.detail.service")} tone="neutral" />}
          </View>
          <Pressable
            onPress={handleCreateLabel}
            disabled={isCreatingLabel}
            style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityState={{ disabled: isCreatingLabel, busy: isCreatingLabel }}
            hitSlop={8}
          >
            {isCreatingLabel ? (
              <ActivityIndicator size={18} color={colors.tint} />
            ) : (
              <Icon source="printer-outline" size={20} color={colors.tint} />
            )}
            <Text style={styles.quickActionLabel}>{t("inventory.createLabel")}</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionOverline}>{t("products.detail.price")}</Text>
          <Text
            style={styles.priceFigure}
            numberOfLines={1}
            adjustsFontSizeToFit
            accessibilityLabel={`${t("products.detail.price")}: ${formatMoney(product.precio1)}`}
          >
            {formatMoney(product.precio1)}
          </Text>
          {otherPrices.map((price) => (
            <View key={price.level} style={styles.valueRow}>
              <Text style={styles.label}>{t("products.detail.priceLevel", { level: price.level })}</Text>
              <Text style={styles.valueFigure}>{formatMoney(price.value)}</Text>
            </View>
          ))}
        </View>

        {showStock && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.overline}>{t("products.detail.stock")}</Text>
              <Text style={styles.overline}>
                {t("products.detail.stockTotal", { value: formatQuantity(stockOf(product)) })}
              </Text>
            </View>
            {locations.length > 0
              ? locations.map((ex, index) =>
                  renderStockRow(
                    ex.id,
                    ex.localidadNombre,
                    ex.existencia,
                    formatDateTime(ex.ultimaActualizacion),
                    index === 0
                  )
                )
              : renderStockRow("main", t("products.detail.mainWarehouse"), stockOf(product), undefined, true)}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionOverline}>{t("products.detail.info")}</Text>
          {info.map((row, index) => {
            const empty = row.value === null || row.value === undefined || row.value === "";
            return (
              <View key={row.label} style={styles.row}>
                {index > 0 && <View style={styles.separator} />}
                <View style={styles.infoRow}>
                  <Text style={styles.label}>{row.label}</Text>
                  <Text style={[styles.value, empty && styles.emptyValue]} selectable>
                    {empty ? t("catalog.noValue") : String(row.value)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme: CustomTheme, gutter: number) => {
  const { colors, type, spacing, hairline, touchTarget } = theme.custom;
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    appbar: {
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
    },
    hero: {
      paddingHorizontal: gutter,
      paddingBottom: spacing.sm,
      gap: spacing.xs,
    },
    overline: {
      ...type.overline,
    },
    largeTitle: {
      ...type.largeTitle,
    },
    description: {
      ...type.bodySmall,
    },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    quickAction: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: spacing.xs,
      minHeight: touchTarget,
    },
    pressed: {
      opacity: 0.6,
    },
    quickActionLabel: {
      ...type.body,
      fontWeight: "600",
      color: colors.tint,
    },
    section: {
      paddingTop: spacing.xl,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: spacing.md,
      paddingHorizontal: gutter,
      paddingBottom: spacing.xs,
    },
    sectionOverline: {
      ...type.overline,
      paddingHorizontal: gutter,
      paddingBottom: spacing.xs,
    },
    priceFigure: {
      ...type.figure(34),
      paddingHorizontal: gutter,
      paddingBottom: spacing.sm,
    },
    valueRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: spacing.lg,
      paddingHorizontal: gutter,
      paddingVertical: spacing.sm,
    },
    valueFigure: {
      ...type.figure(17),
    },
    row: {
      backgroundColor: colors.background,
    },
    separator: {
      height: hairline,
      marginLeft: gutter,
      backgroundColor: colors.hairline,
    },
    rowContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: gutter,
      paddingVertical: spacing.md,
    },
    rowBody: {
      flex: 1,
      gap: 2,
    },
    rowTitle: {
      ...type.rowTitle,
    },
    caption: {
      ...type.caption,
    },
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: spacing.lg,
      paddingHorizontal: gutter,
      paddingVertical: spacing.md,
    },
    label: {
      ...type.bodySmall,
      flexShrink: 0,
      maxWidth: "45%",
    },
    value: {
      ...type.body,
      fontWeight: "600",
      flex: 1,
      textAlign: "right",
    },
    emptyValue: {
      color: colors.inkTertiary,
      fontWeight: "400",
    },
  });
};

export default ProductDetailScreen;
