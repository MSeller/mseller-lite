import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { ActivityIndicator, FAB, Icon, IconButton, Menu, Text, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { gutterFor, type CustomTheme } from "../../constants/Theme";
import { useBarcodeScanner } from "../../hooks/useBarcodeScanner";
import { useProductAccess } from "../../hooks/useProductAccess";
import { useTranslation } from "../../hooks/useTranslation";
import {
  searchProducts,
  searchProductsByCode,
  searchProductsByText,
} from "../../services/ProductService";
import type { Product } from "../../types/inventory";
import { formatMoney, productDisplayName } from "../../utils/documentFormat";
import CatalogCreateModal from "../catalog/CatalogCreateModal";
import NewProductForm from "../documents/create/NewProductForm";
import BarcodeScanSheet from "../scan/BarcodeScanSheet";
import StatusChip from "../ui/StatusChip";
import { useBottomTabOverflow } from "../ui/TabBarBackground";
import EmptyState, { type EmptyStateAction } from "../ui/EmptyState";
import { stockOf, stockTone } from "../../utils/productStock";

type SearchType = "barcode" | "code" | "text";

const SEARCH_TYPES: { value: SearchType; icon: string }[] = [
  { value: "barcode", icon: "barcode-scan" },
  { value: "code", icon: "pound" },
  { value: "text", icon: "format-text" },
];

/** Nothing matched, or the lookup itself failed — different titles and different next steps. */
type SearchProblem = { kind: "notFound" } | { kind: "failed"; message: string };

interface ProductScreenProps {
  onProductSelect: (product: Product) => void;
  /** Rendered above the search, under the status bar — the Inventario section switcher. */
  headerAccessory?: React.ReactNode;
}

/**
 * Inventario › Productos: look a product up by barcode, code or name and open its prices
 * and stock. Every role reaches it; registering a product from here follows the Consumo
 * API's rule (`useProductAccess`).
 */
const ProductScreen: React.FC<ProductScreenProps> = ({ onProductSelect, headerAccessory }) => {
  const theme = useTheme() as CustomTheme;
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const gutter = gutterFor(width);
  const styles = useMemo(() => createStyles(theme, gutter), [theme, gutter]);
  const { colors } = theme.custom;
  // iOS draws the tab bar over the screen; this is how much of the bottom it covers.
  const tabOverflow = useBottomTabOverflow();
  const { canCreateProducts } = useProductAccess();

  const [searchValue, setSearchValue] = useState("");
  const [searchType, setSearchType] = useState<SearchType>("barcode");
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Product[] | null>(null);
  const [problem, setProblem] = useState<SearchProblem | null>(null);
  // What the last lookup asked for, so a barcode that matched nothing can pre-fill the new product.
  const [lastQuery, setLastQuery] = useState<{ value: string; type: SearchType } | null>(null);
  const [isAutoSearching, setIsAutoSearching] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Barcode scanner detection (legacy - for backwards compatibility)
  const barcodeBuffer = useRef("");
  const barcodeTimeout = useRef<any>(null);
  const lastInputTime = useRef(0);

  const clearSearch = useCallback(() => {
    setSearchValue("");
    setResults(null);
    setProblem(null);
    setLastQuery(null);
  }, []);

  const performSearch = useCallback(
    async (value: string = searchValue, type: SearchType = searchType) => {
      if (!value.trim()) return;

      setLoading(true);
      setProblem(null);
      setResults(null);
      setLastQuery({ value: value.trim(), type });
      try {
        let data;
        switch (type) {
          case "barcode":
            data = await searchProducts(value);
            break;
          case "code":
            data = await searchProductsByCode(value);
            break;
          case "text":
            data = await searchProductsByText(value);
            break;
          default:
            data = await searchProducts(value);
        }
        setResults(data.data);

        if (data.data.length === 0) {
          setProblem({ kind: "notFound" });
        }
      } catch (e: any) {
        // The lookup answers 404 when nothing matches: that is an empty result, not a failure.
        if (e.response?.status === 404 || e.message?.includes("404")) {
          setProblem({ kind: "notFound" });
        } else if (
          e.message?.includes("Network Error") ||
          e.message?.includes("network")
        ) {
          setProblem({ kind: "failed", message: t("errors.networkError") });
        } else if (e.message?.includes("timeout")) {
          setProblem({ kind: "failed", message: t("errors.timeoutError") });
        } else {
          setProblem({ kind: "failed", message: e.message || t("errors.genericError") });
        }
      } finally {
        setLoading(false);
      }
    },
    [searchValue, searchType, t]
  );

  // Barcode scanner hook callback
  const handleBarcodeScanned = useCallback(
    (scannedData: string) => {
      setSearchType("barcode");
      setSearchValue(scannedData);

      setIsAutoSearching(true);
      performSearch(scannedData, "barcode").finally(() => {
        setIsAutoSearching(false);
      });
    },
    [performSearch]
  );

  const { isReady: scannerReady, isScanning } = useBarcodeScanner({
    onScan: handleBarcodeScanned,
    // Off while the camera or the new-product form is open (the form listens to the
    // scanner for its own barcode field), so one read is not handled twice.
    enabled: searchType === "barcode" && !cameraOpen && !creating,
    minLength: 3,
  });

  // Enhanced text input handler with barcode detection
  const handleTextChange = (text: string) => {
    setSearchValue(text);

    // Only do barcode detection for barcode search type
    if (searchType !== "barcode") return;

    const currentTime = Date.now();
    const timeDiff = currentTime - lastInputTime.current;

    if (barcodeTimeout.current) {
      clearTimeout(barcodeTimeout.current);
    }

    // If time between characters is less than 50ms, it's likely a scanner
    if (timeDiff < 50 && barcodeBuffer.current.length > 0) {
      barcodeBuffer.current += text.slice(-1);
    } else {
      barcodeBuffer.current = text;
    }

    lastInputTime.current = currentTime;

    barcodeTimeout.current = setTimeout(() => {
      const potentialBarcode = text.trim();

      // Check if it looks like a barcode (numeric, reasonable length)
      if (potentialBarcode.length >= 8 && /^\d+$/.test(potentialBarcode)) {
        setIsAutoSearching(true);
        performSearch(potentialBarcode, "barcode").finally(() => {
          setIsAutoSearching(false);
        });
      }

      barcodeBuffer.current = "";
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (barcodeTimeout.current) {
        clearTimeout(barcodeTimeout.current);
      }
    };
  }, []);

  const openCamera = useCallback(() => {
    setSearchType("barcode");
    setCameraOpen(true);
  }, []);

  // The new record opens straight away, like a searched one, so its stock and prices show.
  const handleCreated = useCallback(
    (product: Product) => {
      setCreating(false);
      onProductSelect(product);
    },
    [onProductSelect]
  );

  const busy = loading || isAutoSearching;
  const canSubmit = !!searchValue.trim() && !busy;
  const notFoundBarcode =
    problem?.kind === "notFound" && lastQuery?.type === "barcode" ? lastQuery.value : undefined;
  const newProductName = searchType === "text" ? searchValue.trim() : "";

  const scannerCaption = isAutoSearching
    ? t("products.search.autoSearching")
    : searchType === "barcode" && scannerReady
      ? isScanning
        ? t("products.search.scannerReading")
        : t("products.search.scannerReady")
      : "";

  const createAction: EmptyStateAction | undefined = canCreateProducts
    ? { label: t("documents.newProduct.title"), icon: "plus", onPress: () => setCreating(true) }
    : undefined;

  const renderRow = (product: Product, index: number) => {
    const stock = stockOf(product);
    const stockLabel = t("documents.stockShort", { value: stock });
    const inactive = product.status === "I";
    const name = product.nombre ? productDisplayName(product.nombre) : product.codigo;
    const meta = [product.codigo, product.codigoBarra].filter(Boolean).join(" · ");
    const spoken = [
      name,
      meta,
      formatMoney(product.precio1),
      product.esServicio ? null : stockLabel,
      inactive ? t("catalog.inactive") : null,
    ]
      .filter(Boolean)
      .join(", ");

    return (
      <Pressable
        key={product.codigo}
        onPress={() => onProductSelect(product)}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        accessibilityRole="button"
        accessibilityLabel={spoken}
      >
        {index > 0 && <View style={styles.separator} />}
        <View style={styles.rowContent}>
          <View style={styles.rowIcon}>
            <Icon
              source={product.esServicio ? "room-service-outline" : "package-variant-closed"}
              size={22}
              color={colors.tint}
            />
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle} numberOfLines={2}>
              {name}
            </Text>
            {!!meta && (
              <Text style={styles.rowMeta} numberOfLines={1}>
                {meta}
              </Text>
            )}
            {(!product.esServicio || inactive) && (
              <View style={styles.chips}>
                {!product.esServicio && <StatusChip label={stockLabel} tone={stockTone(stock)} />}
                {inactive && <StatusChip label={t("catalog.inactive")} tone="negative" />}
              </View>
            )}
          </View>
          <Text style={styles.rowPrice}>{formatMoney(product.precio1)}</Text>
          <Icon source="chevron-right" size={20} color={colors.inkTertiary} />
        </View>
      </Pressable>
    );
  };

  const renderBody = () => {
    if (loading) {
      return (
        <View style={styles.loading}>
          <ActivityIndicator />
        </View>
      );
    }
    if (problem?.kind === "failed") {
      return (
        <EmptyState
          icon="cloud-alert-outline"
          title={t("products.search.failedTitle")}
          message={problem.message}
          action={{
            label: t("common.retry"),
            icon: "refresh",
            // The query that failed, not whatever the box and mode say now.
            onPress: () => (lastQuery ? performSearch(lastQuery.value, lastQuery.type) : performSearch()),
          }}
        />
      );
    }
    if (problem?.kind === "notFound") {
      return (
        <EmptyState
          icon="package-variant-remove"
          title={t("products.search.notFoundTitle")}
          message={t(canCreateProducts ? "products.search.notFoundCreateBody" : "products.search.notFoundBody")}
          action={
            createAction ?? { label: t("products.search.clear"), icon: "close", onPress: clearSearch }
          }
        />
      );
    }
    if (results && results.length > 0) {
      return (
        <View>
          <Text style={styles.overline}>
            {t("products.search.results", { count: results.length })}
          </Text>
          {results.map(renderRow)}
        </View>
      );
    }
    return (
      <EmptyState
        icon="barcode-scan"
        title={t("products.search.idleTitle")}
        message={t("products.search.idleBody")}
        action={{ label: t("scan.scanBarcode"), icon: "camera-outline", onPress: openCamera }}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {headerAccessory}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          // Room for the create button, so it never covers the last row.
          paddingBottom: (canCreateProducts ? 96 : theme.custom.spacing.xxl) + tabOverflow,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.largeTitle} accessibilityRole="header">
            {t("products.search.title")}
          </Text>
          <Text style={styles.subtitle}>{t("products.search.subtitle")}</Text>
        </View>

        <View style={styles.searchBlock}>
          <View style={styles.well}>
            <Menu
              visible={modeMenuOpen}
              onDismiss={() => setModeMenuOpen(false)}
              anchor={
                <Pressable
                  onPress={() => setModeMenuOpen(true)}
                  style={styles.modePicker}
                  accessibilityRole="button"
                  accessibilityLabel={`${t("products.search.modeLabel")}: ${t(`products.search.mode.${searchType}`)}`}
                >
                  <Text style={styles.modeLabel} numberOfLines={1}>
                    {t(`products.search.modeShort.${searchType}`)}
                  </Text>
                  <Icon source="unfold-more-horizontal" size={18} color={colors.tint} />
                </Pressable>
              }
            >
              {SEARCH_TYPES.map((option) => (
                <Menu.Item
                  key={option.value}
                  title={t(`products.search.mode.${option.value}`)}
                  leadingIcon={searchType === option.value ? "check" : option.icon}
                  onPress={() => {
                    setSearchType(option.value);
                    setModeMenuOpen(false);
                  }}
                />
              ))}
            </Menu>
            <View style={styles.wellDivider} />
            <TextInput
              value={searchValue}
              onChangeText={handleTextChange}
              onSubmitEditing={() => performSearch()}
              placeholder={t(`products.search.placeholder.${searchType}`)}
              placeholderTextColor={colors.inkTertiary}
              keyboardType={searchType === "text" ? "default" : "numeric"}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              style={styles.input}
              selectionColor={colors.tint}
              accessibilityLabel={t(`products.search.mode.${searchType}`)}
            />
            {!!searchValue && (
              <IconButton
                icon="close-circle"
                size={18}
                iconColor={colors.inkTertiary}
                onPress={clearSearch}
                style={styles.wellButton}
                accessibilityLabel={t("products.search.clear")}
              />
            )}
            {searchType === "barcode" && (
              <IconButton
                icon="barcode-scan"
                size={22}
                iconColor={colors.tint}
                onPress={() => setCameraOpen(true)}
                style={styles.wellButton}
                accessibilityLabel={t("scan.scanBarcode")}
              />
            )}
          </View>

          <View style={styles.captionRow}>
            <View style={styles.caption}>
              {!!scannerCaption && (
                <>
                  <Icon
                    source={isAutoSearching ? "magnify" : "barcode-scan"}
                    size={14}
                    color={colors.inkTertiary}
                  />
                  <Text style={styles.captionText} numberOfLines={1}>
                    {scannerCaption}
                  </Text>
                </>
              )}
            </View>
            {/* The numeric keypads have no Return key on iOS, so search stays reachable here. */}
            <Pressable
              onPress={() => performSearch()}
              disabled={!canSubmit}
              style={styles.searchAction}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSubmit }}
              hitSlop={8}
            >
              <Icon source="magnify" size={18} color={canSubmit ? colors.tint : colors.inkTertiary} />
              <Text style={[styles.searchActionLabel, !canSubmit && styles.searchActionDisabled]}>
                {t("common.search")}
              </Text>
            </Pressable>
          </View>
        </View>

        {renderBody()}
      </ScrollView>

      {canCreateProducts && (
        <FAB
          icon="plus"
          label={t("documents.newProduct.title")}
          style={[styles.fab, { bottom: theme.custom.spacing.lg + tabOverflow }]}
          // Paper reads the content colour from these props, not from `style` —
          // tinting the background there alone leaves dark text on a dark FAB.
          color={theme.colors.onPrimary}
          customSize={56}
          onPress={() => setCreating(true)}
        />
      )}

      <BarcodeScanSheet
        visible={cameraOpen}
        onDismiss={() => setCameraOpen(false)}
        onScan={handleBarcodeScanned}
        title={t("scan.scanBarcode")}
      />

      <CatalogCreateModal
        visible={creating}
        title={t("documents.newProduct.title")}
        busy={saving}
        onDismiss={() => setCreating(false)}
      >
        <NewProductForm
          initialName={newProductName}
          initialBarcode={notFoundBarcode}
          onCreated={handleCreated}
          onBusyChange={setSaving}
        />
      </CatalogCreateModal>
    </SafeAreaView>
  );
};

const createStyles = (theme: CustomTheme, gutter: number) => {
  const { colors, type, spacing, radius, hairline, touchTarget } = theme.custom;
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
    },
    header: {
      paddingHorizontal: gutter,
      paddingTop: spacing.sm,
      gap: spacing.xs,
    },
    largeTitle: {
      ...type.largeTitle,
    },
    subtitle: {
      ...type.bodySmall,
    },
    searchBlock: {
      paddingHorizontal: gutter,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
    },
    well: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 48,
      backgroundColor: colors.fill,
      borderRadius: radius.control,
      paddingRight: spacing.xs,
    },
    modePicker: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      minHeight: touchTarget,
      paddingLeft: spacing.md,
      paddingRight: spacing.sm,
    },
    modeLabel: {
      ...type.bodySmall,
      fontWeight: "600",
      color: colors.tint,
    },
    wellDivider: {
      width: hairline,
      alignSelf: "stretch",
      marginVertical: spacing.md,
      backgroundColor: colors.hairline,
    },
    input: {
      ...type.body,
      flex: 1,
      minHeight: 48,
      paddingHorizontal: spacing.md,
      paddingVertical: 0,
    },
    wellButton: {
      margin: 0,
    },
    captionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
      minHeight: touchTarget,
    },
    caption: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    captionText: {
      ...type.caption,
      flexShrink: 1,
    },
    searchAction: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      minHeight: touchTarget,
      paddingLeft: spacing.sm,
    },
    searchActionLabel: {
      ...type.bodySmall,
      fontWeight: "600",
      color: colors.tint,
    },
    searchActionDisabled: {
      color: colors.inkTertiary,
    },
    loading: {
      paddingVertical: spacing.xxl,
      alignItems: "center",
    },
    overline: {
      ...type.overline,
      paddingHorizontal: gutter,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
    },
    row: {
      backgroundColor: colors.background,
    },
    rowPressed: {
      backgroundColor: colors.fill,
    },
    // Inset to the text column, like iOS grouped rows, so the icons read as one column.
    separator: {
      height: hairline,
      marginLeft: gutter + touchTarget + spacing.md,
      backgroundColor: colors.hairline,
    },
    rowContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: gutter,
      paddingVertical: spacing.md,
    },
    rowIcon: {
      width: touchTarget,
      height: touchTarget,
      borderRadius: radius.container,
      backgroundColor: colors.tintSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    rowBody: {
      flex: 1,
      gap: spacing.xs,
    },
    rowTitle: {
      ...type.rowTitle,
    },
    rowMeta: {
      ...type.caption,
    },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
    },
    rowPrice: {
      ...type.figure(17),
    },
    fab: {
      position: "absolute",
      right: gutter,
      ...theme.custom.surface.gradientShadow,
      borderRadius: radius.control,
      backgroundColor: theme.colors.primary,
      paddingHorizontal: spacing.sm,
    },
  });
};

export default ProductScreen;
