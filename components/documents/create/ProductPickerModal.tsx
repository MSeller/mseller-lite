import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Image, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Chip,
  Divider,
  Icon,
  Portal,
  Searchbar,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { CustomTheme } from "../../../constants/Theme";
import { useTranslation } from "../../../hooks/useTranslation";
import { useBarcodeScanner } from "../../../hooks/useBarcodeScanner";
import { usePagedSearch, type SearchPage } from "../../../hooks/usePagedSearch";
import { searchProducts, searchProductsForDocument } from "../../../services/ProductService";
import type { Product } from "../../../types/inventory";
import { formatMoney, formatUnitWithFactor, productDisplayName } from "../../../utils/documentFormat";
import { productThumbnailUrl } from "../../../utils/productPhoto";
import BarcodeScanSheet from "../../scan/BarcodeScanSheet";
import FullScreenModal from "../../ui/FullScreenModal";
import NewProductForm from "./NewProductForm";
import ProductPhotoSheet from "./ProductPhotoSheet";
import AppButton from "../../ui/AppButton";

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onSelect: (product: Product) => void;
  /** Codes already in the cart, marked so a second tap is a deliberate choice. */
  selectedCodes?: string[];
}

type Mode = "search" | "create";

/** The picker shows the first page of matches; there is no paging here. */
const searchProductPage = async (query: string): Promise<SearchPage<Product>> => {
  const result = await searchProductsForDocument(query.trim());
  return { items: result.data ?? [], hasMore: false };
};

/**
 * Full-screen product picker for the document being captured: search the
 * catalogue, or register a product with just a name and a price.
 *
 * Stays open after a tap. Building a document means adding several products in a
 * row, and closing the sheet each time would cost a re-open and a re-search per
 * line; a running count in the header is the feedback instead.
 */
const ProductPickerModal: React.FC<Props> = ({
  visible,
  onDismiss,
  onSelect,
  selectedCodes = [],
}) => {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<Mode>("search");
  const [search, setSearch] = useState("");
  const {
    items: results,
    setItems: setResults,
    loading,
    error: searchError,
  } = usePagedSearch({ query: search, fetchPage: searchProductPage, enabled: visible && mode === "search" });
  const error = searchError ? t("documents.errors.productSearchFailed") : "";
  const [addedCount, setAddedCount] = useState(0);

  // What the new-product form opens with: the search that found nothing, or a scanned
  // barcode that matched no product.
  const [nuevo, setNuevo] = useState<{ nombre: string; codigoBarra: string }>({ nombre: "", codigoBarra: "" });
  const [ocupado, setOcupado] = useState(false);

  // The catalogue product whose photo sheet is open.
  const [fotoDe, setFotoDe] = useState<Product | null>(null);

  // The camera scanner, adding products to the document while it is open.
  const [escaneando, setEscaneando] = useState(false);
  const [avisoEscaneo, setAvisoEscaneo] = useState("");

  const selected = useMemo(() => new Set(selectedCodes), [selectedCodes]);

  useEffect(() => {
    if (!visible) {
      setMode("search");
      setSearch("");
      setAddedCount(0);
      setFotoDe(null);
      setEscaneando(false);
      setAvisoEscaneo("");
    }
  }, [visible]);

  const handleAdd = useCallback(
    (product: Product) => {
      onSelect(product);
      setAddedCount((n) => n + 1);
    },
    [onSelect]
  );

  const handleCreated = useCallback(
    (product: Product) => {
      handleAdd(product);
      setMode("search");
    },
    [handleAdd]
  );

  const abrirNuevo = useCallback((nombre: string, codigoBarra = "") => {
    setNuevo({ nombre, codigoBarra });
    setMode("create");
  }, []);

  /**
   * A scan while picking products: an exact barcode match goes straight into the document; no
   * match opens New product with the barcode already filled in, because an unknown barcode in
   * the field almost always means a product nobody registered yet.
   */
  const agregarPorCodigoBarra = useCallback(
    async (barcode: string) => {
      let encontrados: Product[] = [];
      try {
        encontrados = (await searchProducts(barcode)).data ?? [];
      } catch (e: any) {
        // The search answers 404 when nothing matches; anything else is a real failure.
        if (e?.response?.status !== 404) {
          setAvisoEscaneo(t("scan.lookupFailed"));
          return;
        }
      }

      // The search can also return partial matches; only an exact barcode is added blindly.
      const exacto = encontrados.find((p) => (p.codigoBarra ?? "").trim() === barcode);
      if (exacto) {
        handleAdd(exacto);
        setAvisoEscaneo(t("scan.added", { name: exacto.nombre || exacto.codigo }));
        return;
      }

      setEscaneando(false);
      setAvisoEscaneo("");
      abrirNuevo("", barcode);
    },
    [handleAdd, abrirNuevo, t]
  );

  // A built-in hardware scanner feeds the same handler as the camera. Off while the camera
  // sheet is open, so one read is not handled twice, and in New product, whose form fills
  // its barcode field from the scanner itself.
  useBarcodeScanner({
    onScan: agregarPorCodigoBarra,
    enabled: visible && mode === "search" && !escaneando && !fotoDe,
  });

  const renderProduct = useCallback(
    ({ item }: { item: Product }) => {
      const inCart = selected.has(item.codigo);
      const unitLabel = formatUnitWithFactor(item.unidad, item.factor);
      const miniatura = productThumbnailUrl(item.imagenes);
      return (
        <TouchableRipple onPress={() => handleAdd(item)} style={styles.row}>
          <View style={styles.rowInner}>
            {/* Its own touch target: tapping the picture opens the photo sheet, tapping the
                rest of the row adds the product — so adding a photo never lands in the cart. */}
            <TouchableRipple
              onPress={() => setFotoDe(item)}
              borderless
              style={styles.thumbTouch}
              accessibilityRole="button"
              accessibilityLabel={t("documents.productPhoto.addToExisting")}
            >
              <View style={styles.thumb}>
                {miniatura ? (
                  <Image source={{ uri: miniatura }} style={styles.thumbImage} />
                ) : (
                  <Icon source="camera-plus-outline" size={22} color={theme.colors.onSurfaceVariant} />
                )}
                {inCart && (
                  <View style={styles.inCartBadge}>
                    <Icon source="check" size={12} color={theme.colors.onPrimary} />
                  </View>
                )}
              </View>
            </TouchableRipple>

            <View style={styles.rowBody}>
              <Text variant="titleSmall" style={styles.rowTitle} numberOfLines={2}>
                {item.nombre ? productDisplayName(item.nombre) : item.codigo}
              </Text>
              <Text variant="bodySmall" style={styles.rowMeta} numberOfLines={1}>
                {item.codigo}
                {unitLabel ? ` · ${unitLabel}` : ""}
                {item.impuesto ? ` · ${t("documents.taxShort", { value: item.impuesto })}` : ""}
              </Text>
            </View>

            <View style={styles.rowRight}>
              <Text variant="titleSmall" style={styles.price}>
                {formatMoney(item.precio1 ?? 0)}
              </Text>
              <Text variant="bodySmall" style={styles.stock}>
                {t("documents.stockShort", { value: item.existenciaAlmacen1 ?? 0 })}
              </Text>
            </View>
          </View>
        </TouchableRipple>
      );
    },
    [handleAdd, selected, styles, theme, t]
  );

  return (
    <Portal>
      <FullScreenModal
        visible={visible}
        onDismiss={onDismiss}
        style={styles.modal}
        dismissable={!ocupado}
      >
        <Appbar.Header mode="small" style={styles.appbar}>
          {mode === "create" ? (
            <Appbar.BackAction onPress={() => setMode("search")} disabled={ocupado} />
          ) : (
            <Appbar.Action icon="close" onPress={onDismiss} />
          )}
          <Appbar.Content
            title={mode === "create" ? t("documents.newProduct.title") : t("documents.addProducts")}
          />
          {mode === "search" && addedCount > 0 && (
            <Chip compact style={styles.countChip} textStyle={styles.countChipText}>
              {t("documents.addedCount", { count: addedCount })}
            </Chip>
          )}
          {mode === "search" && (
            <AppButton mode="text" compact onPress={onDismiss} style={styles.doneButton}>
              {t("common.confirm")}
            </AppButton>
          )}
        </Appbar.Header>
        <Divider />

        {mode === "search" ? (
          // The search box opens the keyboard, which would otherwise cover the
          // "new product" button pinned to the bottom.
          <KeyboardAvoidingView
            style={styles.formFlex}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.searchWrap}>
              <Searchbar
                value={search}
                onChangeText={setSearch}
                placeholder={t("documents.productSearchPlaceholder")}
                style={styles.searchbar}
                inputStyle={styles.searchInput}
                autoFocus
                traileringIcon="barcode-scan"
                traileringIconAccessibilityLabel={t("scan.scanProducts")}
                onTraileringIconPress={() => {
                  setAvisoEscaneo("");
                  setEscaneando(true);
                }}
              />
            </View>

            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" />
              </View>
            ) : (
              <FlatList
                data={results}
                keyExtractor={(item) => item.codigo}
                renderItem={renderProduct}
                ItemSeparatorComponent={() => <Divider />}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                  <View style={styles.center}>
                    <Icon
                      source="package-variant"
                      size={48}
                      color={theme.colors.onSurfaceVariant}
                    />
                    <Text style={styles.emptyText}>
                      {error || t("documents.noProductsFound")}
                    </Text>
                  </View>
                }
              />
            )}

            <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
              <AppButton
                mode="contained-tonal"
                icon="plus-box"
                onPress={() => abrirNuevo(search.trim())}
                contentStyle={styles.footerButtonContent}
                style={styles.footerButton}
              >
                {t("documents.newProduct.action")}
              </AppButton>
            </View>
          </KeyboardAvoidingView>
        ) : (
          <NewProductForm
            initialName={nuevo.nombre}
            initialBarcode={nuevo.codigoBarra}
            onCreated={handleCreated}
            onBusyChange={setOcupado}
          />
        )}
      </FullScreenModal>

      <BarcodeScanSheet
        visible={escaneando}
        onDismiss={() => setEscaneando(false)}
        onScan={agregarPorCodigoBarra}
        title={t("scan.scanProducts")}
        continuous
        feedback={avisoEscaneo}
      />

      <ProductPhotoSheet
        product={fotoDe}
        onDismiss={() => setFotoDe(null)}
        onSaved={(codigo, imagenes) =>
          setResults((prev) => prev.map((p) => (p.codigo === codigo ? { ...p, imagenes } : p)))
        }
      />
    </Portal>
  );
};

const createStyles = (theme: CustomTheme) =>
  StyleSheet.create({
    modal: {
      // A picker is a full-height sheet of rows, so it sits on `surface` rather
      // than the paper page tone — the rows read crisper on white, and the sheet
      // reads as something that came up over the screen.
      backgroundColor: theme.colors.surface,
    },
    appbar: {
      backgroundColor: theme.colors.surface,
    },
    countChip: {
      backgroundColor: theme.colors.primaryContainer,
      marginRight: 4,
    },
    countChipText: {
      color: theme.colors.onPrimaryContainer,
      fontWeight: "700",
      fontSize: theme.custom.type.overline.fontSize,
    },
    doneButton: {
      marginRight: 4,
    },
    searchWrap: {
      padding: 16,
      paddingBottom: 8,
    },
    searchbar: {
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.custom.radius.control,
      minHeight: 52,
    },
    searchInput: {
      minHeight: 52,
    },
    center: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 48,
      gap: 8,
    },
    emptyText: {
      color: theme.colors.onSurfaceVariant,
      textAlign: "center",
      paddingHorizontal: 32,
    },
    listContent: {
      paddingBottom: 16,
      flexGrow: 1,
    },
    row: {
      minHeight: 68,
      justifyContent: "center",
      paddingHorizontal: 16,
    },
    rowInner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
    },
    thumb: {
      width: 44,
      height: 44,
      borderRadius: theme.custom.radius.container,
      backgroundColor: theme.colors.surfaceVariant,
      alignItems: "center",
      justifyContent: "center",
    },
    thumbTouch: {
      borderRadius: theme.custom.radius.container,
    },
    thumbImage: {
      width: 44,
      height: 44,
      borderRadius: theme.custom.radius.container,
    },
    inCartBadge: {
      position: "absolute",
      right: -2,
      bottom: -2,
      width: 18,
      height: 18,
      borderRadius: 18 / 2,
      backgroundColor: theme.colors.primary,
      borderWidth: 2,
      borderColor: theme.colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    rowBody: {
      flex: 1,
      gap: 2,
    },
    rowTitle: {
      color: theme.colors.onSurface,
      fontWeight: "600",
    },
    rowMeta: {
      color: theme.colors.onSurfaceVariant,
    },
    rowRight: {
      alignItems: "flex-end",
      gap: 2,
    },
    price: {
      color: theme.colors.onSurface,
      fontWeight: "700",
    },
    stock: {
      color: theme.colors.onSurfaceVariant,
    },
    footer: {
      padding: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surface,
    },
    footerButton: {
      borderRadius: theme.custom.radius.control,
    },
    footerButtonContent: {
      height: 52,
    },
    formFlex: {
      flex: 1,
    },
  });

export default ProductPickerModal;
