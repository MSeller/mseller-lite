import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Icon, Text, useTheme } from "react-native-paper";

import type { CustomTheme } from "../../constants/Theme";
import { usePagedSearch, type SearchPage } from "../../hooks/usePagedSearch";
import { useTranslation } from "../../hooks/useTranslation";
import { searchProductsForDocument } from "../../services/ProductService";
import type { ProductoEditable } from "../../types/catalog";
import type { Product } from "../../types/inventory";
import { formatMoney } from "../../utils/documentFormat";
import AppCard from "../ui/AppCard";
import StatusChip from "../ui/StatusChip";
import CatalogList, { CATALOG_PAGE_SIZE } from "./CatalogList";
import ProductDetail from "./ProductDetail";

interface Props {
  /** The Catálogo section switcher, shown on the list only. */
  headerAccessory?: React.ReactNode;
}

const keyExtractor = (item: Product) => item.codigo;

// `buscar-productos` pages from 0 and answers 404 (handled as empty) when nothing matches.
const fetchProducts = async (query: string, page: number): Promise<SearchPage<Product>> => {
  const result = await searchProductsForDocument(query.trim(), page - 1, CATALOG_PAGE_SIZE);
  const items = result.data ?? [];
  const hasMore = result.totalPages ? page < result.totalPages : items.length === CATALOG_PAGE_SIZE;
  return { items, hasMore };
};

/** What a saved record changes on its list row. */
const applyToProduct =
  (producto: ProductoEditable) =>
  (item: Product): Product => ({
    // Every editable field is a `Product` field of the same name; only the text fields
    // the editable record may send as null go back to the list's empty strings.
    ...item,
    ...producto,
    codigoBarra: producto.codigoBarra ?? "",
    area: producto.area ?? "",
    departamento: producto.departamento ?? "",
    unidad: producto.unidad ?? "",
    empaque: producto.empaque ?? "",
    tipoImpuesto: producto.tipoImpuesto ?? "",
  });

/**
 * Catálogo › Productos: search the product master, open one, edit it.
 *
 * Separate from Inventario › Productos, which is a stock lookup for every role;
 * this one edits the record and is offered to administrators only.
 */
const ProductsCatalogScreen: React.FC<Props> = ({ headerAccessory }) => {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const results = usePagedSearch({ query: search, fetchPage: fetchProducts });
  const { setItems } = results;

  const renderRow = useCallback(
    (item: Product) => (
      <AppCard onPress={() => setSelected(item)}>
        <View style={styles.row}>
          <View style={styles.iconBadge}>
            <Icon
              source={item.esServicio ? "room-service-outline" : "package-variant-closed"}
              size={22}
              color={theme.colors.primary}
            />
          </View>
          <View style={styles.body}>
            <View style={styles.topRow}>
              <Text variant="titleSmall" style={styles.name} numberOfLines={1}>
                {item.nombre}
              </Text>
              <Text variant="titleSmall" style={styles.price}>
                {formatMoney(item.precio1)}
              </Text>
            </View>
            <Text variant="bodySmall" style={styles.meta} numberOfLines={1}>
              {item.codigo}
              {item.codigoBarra ? ` · ${item.codigoBarra}` : ""}
            </Text>
            {item.status === "I" && <StatusChip label={t("catalog.inactive")} tone="negative" />}
          </View>
          <Icon source="chevron-right" size={22} color={theme.colors.onSurfaceVariant} />
        </View>
      </AppCard>
    ),
    [styles, theme, t]
  );

  const handleUpdated = useCallback(
    (producto: ProductoEditable) => {
      const apply = applyToProduct(producto);
      setItems((rows) => rows.map((row) => (row.codigo === producto.codigo ? apply(row) : row)));
    },
    [setItems]
  );

  const handleBack = useCallback(() => setSelected(null), []);

  return (
    <>
      <View style={selected ? styles.hidden : styles.fill}>
        <CatalogList
          search={search}
          onSearchChange={setSearch}
          results={results}
          keyExtractor={keyExtractor}
          renderRow={renderRow}
          headerAccessory={headerAccessory}
          searchPlaceholder={t("catalog.products.searchPlaceholder")}
          emptyIcon="package-variant"
          emptyTitle={t("catalog.products.emptyTitle")}
          emptyBody={t("catalog.products.emptyBody")}
          emptySearchTitle={t("catalog.products.emptySearchTitle")}
          emptySearchBody={t("catalog.products.emptySearchBody")}
        />
      </View>
      {selected && (
        <View style={styles.fill}>
          <ProductDetail
            key={selected.codigo}
            codigo={selected.codigo}
            nombre={selected.nombre}
            onBack={handleBack}
            onUpdated={handleUpdated}
          />
        </View>
      )}
    </>
  );
};

const createStyles = (theme: CustomTheme) =>
  StyleSheet.create({
    fill: {
      flex: 1,
    },
    hidden: {
      display: "none",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    iconBadge: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: `${theme.colors.primary}14`,
      alignItems: "center",
      justifyContent: "center",
    },
    body: {
      flex: 1,
      gap: 3,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    name: {
      color: theme.colors.onSurface,
      fontWeight: "600",
      flexShrink: 1,
    },
    price: {
      color: theme.colors.onSurface,
      fontWeight: "700",
    },
    meta: {
      color: theme.colors.onSurfaceVariant,
    },
  });

export default ProductsCatalogScreen;
