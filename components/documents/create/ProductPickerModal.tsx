import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Button,
  Chip,
  Divider,
  HelperText,
  Icon,
  Modal,
  Portal,
  Searchbar,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";

import type { CustomTheme } from "../../../constants/Theme";
import { useTranslation } from "../../../hooks/useTranslation";
import { createProduct, searchProductsForDocument } from "../../../services/ProductService";
import type { NewProductRequest } from "../../../types/documents";
import type { Product } from "../../../types/inventory";
import {
  formatMoney,
  formatUnitWithFactor,
  parseNumericInput,
} from "../../../utils/documentFormat";
import { productThumbnailUrl, type UploadedProductPhoto } from "../../../utils/productPhoto";
import ProductPhotoField from "./ProductPhotoField";
import ProductPhotoSheet from "./ProductPhotoSheet";

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onSelect: (product: Product) => void;
  /** Codes already in the cart, marked so a second tap is a deliberate choice. */
  selectedCodes?: string[];
}

type Mode = "search" | "create";

const SEARCH_DEBOUNCE_MS = 350;

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

  const [mode, setMode] = useState<Mode>("search");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [addedCount, setAddedCount] = useState(0);

  // New-product form
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [impuesto, setImpuesto] = useState("");
  const [unidad, setUnidad] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [foto, setFoto] = useState<UploadedProductPhoto | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  // The catalogue product whose photo sheet is open.
  const [fotoDe, setFotoDe] = useState<Product | null>(null);

  const selected = useMemo(() => new Set(selectedCodes), [selectedCodes]);

  const resetAll = useCallback(() => {
    setMode("search");
    setSearch("");
    setResults([]);
    setError("");
    setAddedCount(0);
    setNombre("");
    setPrecio("");
    setImpuesto("");
    setUnidad("");
    setFormError("");
    setFoto(null);
    setFotoDe(null);
  }, []);

  useEffect(() => {
    if (!visible) resetAll();
  }, [visible, resetAll]);

  useEffect(() => {
    if (!visible || mode !== "search") return;

    let active = true;
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const result = await searchProductsForDocument(search.trim());
        if (active) {
          setResults(result.data ?? []);
          setError("");
        }
      } catch {
        if (active) {
          setResults([]);
          setError(t("documents.errors.productSearchFailed"));
        }
      } finally {
        if (active) setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [search, visible, mode, t]);

  const handleAdd = useCallback(
    (product: Product) => {
      onSelect(product);
      setAddedCount((n) => n + 1);
    },
    [onSelect]
  );

  const handleCreate = useCallback(async () => {
    const trimmed = nombre.trim();
    const price = parseNumericInput(precio);

    if (!trimmed) {
      setFormError(t("documents.newProduct.nameRequired"));
      return;
    }
    if (price <= 0) {
      setFormError(t("documents.newProduct.priceRequired"));
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      const payload: NewProductRequest = {
        nombre: trimmed,
        precio1: price,
        impuesto: impuesto ? parseNumericInput(impuesto) : undefined,
        unidad: unidad.trim() || undefined,
        imagenes: foto ? [foto.photo] : undefined,
      };
      const created = await createProduct(payload);

      // Adapt the created record to the catalogue shape the cart consumes, so a
      // just-created product behaves exactly like a searched one.
      handleAdd({
        codigo: created.codigo,
        nombre: created.nombre,
        descripcion: created.descripcion,
        unidad: created.unidad ?? "",
        precio1: created.precio,
        impuesto: created.impuesto,
        factor: created.factor,
        existenciaAlmacen1: created.existencia,
        codigoBarra: created.codigoBarra ?? "",
      } as Product);

      setMode("search");
      setNombre("");
      setPrecio("");
      setImpuesto("");
      setUnidad("");
      setFoto(null);
    } catch (e: any) {
      setFormError(e?.response?.data?.message || t("documents.errors.productCreateFailed"));
    } finally {
      setSaving(false);
    }
  }, [nombre, precio, impuesto, unidad, foto, handleAdd, t]);

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
                {item.nombre || item.codigo}
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
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
        dismissable={!saving}
      >
        <Appbar.Header mode="small" style={styles.appbar}>
          {mode === "create" ? (
            <Appbar.BackAction onPress={() => setMode("search")} disabled={saving} />
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
            <Button mode="text" compact onPress={onDismiss} style={styles.doneButton}>
              {t("common.confirm")}
            </Button>
          )}
        </Appbar.Header>
        <Divider />

        {mode === "search" ? (
          <>
            <View style={styles.searchWrap}>
              <Searchbar
                value={search}
                onChangeText={setSearch}
                placeholder={t("documents.productSearchPlaceholder")}
                style={styles.searchbar}
                inputStyle={styles.searchInput}
                autoFocus
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

            <View style={styles.footer}>
              <Button
                mode="contained-tonal"
                icon="plus-box"
                onPress={() => {
                  setNombre(search.trim());
                  setMode("create");
                }}
                contentStyle={styles.footerButtonContent}
                style={styles.footerButton}
              >
                {t("documents.newProduct.action")}
              </Button>
            </View>
          </>
        ) : (
          // A fixed container puts the last fields and the save button under the
          // on-screen keyboard on a short phone, with no way to scroll to them.
          <KeyboardAvoidingView
            style={styles.formFlex}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <ScrollView
              contentContainerStyle={styles.form}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
            <ProductPhotoField
              value={foto}
              onChange={setFoto}
              onBusyChange={setSubiendoFoto}
              disabled={saving}
            />
            <TextInput
              mode="outlined"
              label={t("documents.newProduct.name")}
              value={nombre}
              onChangeText={setNombre}
              style={styles.input}
              autoFocus
              autoCapitalize="words"
            />
            <TextInput
              mode="outlined"
              label={t("documents.newProduct.price")}
              value={precio}
              onChangeText={setPrecio}
              style={styles.input}
              keyboardType="decimal-pad"
              inputMode="decimal"
              right={precio ? <TextInput.Icon icon="close" onPress={() => setPrecio("")} /> : null}
            />
            <TextInput
              mode="outlined"
              label={t("documents.newProduct.tax")}
              value={impuesto}
              onChangeText={setImpuesto}
              style={styles.input}
              keyboardType="decimal-pad"
              inputMode="decimal"
            />
            <TextInput
              mode="outlined"
              label={t("documents.newProduct.unit")}
              value={unidad}
              onChangeText={setUnidad}
              style={styles.input}
              autoCapitalize="characters"
            />

            <HelperText type={formError ? "error" : "info"} visible>
              {formError || t("documents.newProduct.hint")}
            </HelperText>

            <Button
              mode="contained"
              onPress={handleCreate}
              loading={saving}
              disabled={saving || subiendoFoto || !nombre.trim() || parseNumericInput(precio) <= 0}
              contentStyle={styles.footerButtonContent}
              style={styles.footerButton}
            >
              {t("documents.newProduct.save")}
            </Button>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </Modal>

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
      margin: 0,
      flex: 1,
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
      fontSize: 12,
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
      borderRadius: 12,
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
      borderRadius: 12,
      backgroundColor: theme.colors.surfaceVariant,
      alignItems: "center",
      justifyContent: "center",
    },
    thumbTouch: {
      borderRadius: 12,
    },
    thumbImage: {
      width: 44,
      height: 44,
      borderRadius: 12,
    },
    inCartBadge: {
      position: "absolute",
      right: -2,
      bottom: -2,
      width: 18,
      height: 18,
      borderRadius: 9,
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
      borderRadius: 12,
    },
    footerButtonContent: {
      height: 52,
    },
    formFlex: {
      flex: 1,
    },
    form: {
      padding: 16,
      paddingBottom: 32,
      gap: 12,
    },
    input: {
      backgroundColor: theme.colors.surface,
    },
  });

export default ProductPickerModal;
