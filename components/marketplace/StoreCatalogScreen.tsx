import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Banner,
  Button,
  Chip,
  Dialog,
  Portal,
  Searchbar,
  Text,
  useTheme,
} from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import type { CustomTheme } from "../../constants/Theme";
import { useMarketplaceCart } from "../../contexts/MarketplaceCartContext";
import { usePagedSearch, type SearchPage } from "../../hooks/usePagedSearch";
import { useTranslation } from "../../hooks/useTranslation";
import { listStoreAreas, listStoreCatalog } from "../../services/b2bService";
import type { ProductoCatalogo } from "../../types/b2b";
import { describeB2BError } from "../../utils/b2b";
import { formatMoney, formatQuantity } from "../../utils/documentFormat";
import EmptyState from "../ui/EmptyState";
import CatalogProductCard from "./CatalogProductCard";
import SellerContactDialog, { useSellerContact } from "./SellerContactDialog";

const PAGE_SIZE = 20;

interface Props {
  tiendaId: string;
  tiendaNombre: string;
}

/**
 * A supplier's catalogue: the screen the buyer actually shops in.
 *
 * Categories come from the store's own `/areas`, so the tabs match how that supplier
 * organises its products rather than a list this app invented. Search and the category
 * both go to the server — the catalogue is paged and can be thousands of products, so
 * filtering what happens to be loaded would quietly lie about what the store sells.
 */
const StoreCatalogScreen: React.FC<Props> = ({ tiendaId, tiendaNombre }) => {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cart = useMarketplaceCart();

  const [search, setSearch] = useState("");
  const [area, setArea] = useState<string | null>(null);
  const [areas, setAreas] = useState<string[]>([]);
  const [sellerVisible, setSellerVisible] = useState(false);
  /** The product waiting on "your cart belongs to another store" being answered. */
  const [pendingProduct, setPendingProduct] = useState<ProductoCatalogo | null>(null);

  const seller = useSellerContact(tiendaId);

  useEffect(() => {
    let active = true;
    // The tabs are a convenience: a store with no areas configured, or a failed lookup,
    // just shows the whole catalogue instead of blocking it behind an error.
    listStoreAreas(tiendaId)
      .then((value) => {
        if (active) setAreas(value);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [tiendaId]);

  const fetchPage = useCallback(
    async (busqueda: string, page: number): Promise<SearchPage<ProductoCatalogo>> => {
      const result = await listStoreCatalog(tiendaId, {
        busqueda,
        area: area ?? undefined,
        pageNumber: page,
        pageSize: PAGE_SIZE,
      });
      return { items: result.items, hasMore: result.hasNextPage };
    },
    [tiendaId, area]
  );

  const results = usePagedSearch<ProductoCatalogo>({ query: search, fetchPage });
  const { items, loading, refreshing, loadingMore, hasMore, error, refresh, loadMore, retry } =
    results;

  const failure = error ? describeB2BError(error) : null;
  const searching = !!search.trim();

  const add = useCallback(
    (producto: ProductoCatalogo) => {
      // One cart, one supplier: a purchase request goes to a single store, so shopping
      // elsewhere has to be confirmed rather than silently dropping what is in the cart.
      if (!cart.belongsTo(tiendaId)) {
        setPendingProduct(producto);
        return;
      }
      cart.add(tiendaId, tiendaNombre, producto);
    },
    [cart, tiendaId, tiendaNombre]
  );

  const openProduct = useCallback(
    (producto: ProductoCatalogo) =>
      router.push({
        pathname: "/marketplace/[tiendaId]/producto/[codigoProducto]",
        params: { tiendaId, codigoProducto: producto.codigo, nombre: tiendaNombre },
      }),
    [router, tiendaId, tiendaNombre]
  );

  const renderItem = useCallback(
    ({ item }: { item: ProductoCatalogo }) => (
      <CatalogProductCard
        producto={item}
        enCarrito={cart.tiendaId === tiendaId ? cart.quantityOf(item.codigo) : 0}
        onPress={() => openProduct(item)}
        onAdd={() => add(item)}
      />
    ),
    [add, cart, openProduct, tiendaId]
  );

  const errorMessage = failure
    ? items.length > 0
      ? t("marketplace.errors.loadMoreFailed")
      : failure.message || t("marketplace.errors.catalogFailed")
    : "";

  const cartVisible = cart.tiendaId === tiendaId && !cart.isEmpty;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Appbar.Header mode="small" style={styles.appbar}>
        <Appbar.BackAction
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/(tabs)/marketplace")
          }
        />
        <Appbar.Content title={tiendaNombre || t("marketplace.title")} />
        {seller.available && (
          <Appbar.Action
            icon="account-tie-outline"
            accessibilityLabel={t("marketplace.contactSeller")}
            onPress={() => setSellerVisible(true)}
          />
        )}
      </Appbar.Header>

      <View style={styles.header}>
        <Searchbar
          value={search}
          onChangeText={setSearch}
          placeholder={t("marketplace.searchProducts")}
          style={styles.searchbar}
          inputStyle={styles.searchInput}
          returnKeyType="search"
          autoCorrect={false}
        />
      </View>

      {areas.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.areas}
        >
          <Chip selected={area === null} onPress={() => setArea(null)} style={styles.areaChip}>
            {t("marketplace.allAreas")}
          </Chip>
          {areas.map((value) => (
            <Chip
              key={value}
              selected={area === value}
              onPress={() => setArea(area === value ? null : value)}
              style={styles.areaChip}
            >
              {value}
            </Chip>
          ))}
        </ScrollView>
      )}

      {!!failure && (
        <Banner visible icon="wifi-off" actions={[{ label: t("common.retry"), onPress: retry }]}>
          {errorMessage}
        </Banner>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.codigo}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.column}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: (cartVisible ? 108 : 32) + insets.bottom },
          ]}
          ListEmptyComponent={
            failure ? null : (
              <EmptyState
                icon="package-variant"
                title={
                  searching ? t("marketplace.noProductsFoundTitle") : t("marketplace.emptyCatalogTitle")
                }
                message={
                  searching ? t("marketplace.noProductsFoundBody") : t("marketplace.emptyCatalogBody")
                }
                style={styles.empty}
              />
            )
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator />
              </View>
            ) : hasMore && failure ? (
              <View style={styles.footer}>
                <Button mode="text" onPress={retry}>
                  {t("common.retry")}
                </Button>
              </View>
            ) : null
          }
        />
      )}

      {cartVisible && (
        <View style={[styles.cartBar, { paddingBottom: 12 + insets.bottom }]}>
          <Button
            mode="contained"
            icon="cart-outline"
            contentStyle={styles.cartButtonContent}
            onPress={() =>
              router.push({
                pathname: "/marketplace/[tiendaId]/carrito",
                params: { tiendaId, nombre: tiendaNombre },
              })
            }
          >
            {t("marketplace.viewCart", {
              value: formatQuantity(cart.itemCount),
              total: formatMoney(cart.total),
            })}
          </Button>
        </View>
      )}

      <SellerContactDialog
        visible={sellerVisible}
        onDismiss={() => setSellerVisible(false)}
        contact={seller.contact}
      />

      <Portal>
        <Dialog visible={!!pendingProduct} onDismiss={() => setPendingProduct(null)}>
          <Dialog.Title>{t("marketplace.switchStoreTitle")}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              {t("marketplace.switchStoreBody", { tienda: cart.tiendaNombre })}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPendingProduct(null)}>{t("common.cancel")}</Button>
            <Button
              mode="contained"
              onPress={() => {
                if (pendingProduct) cart.add(tiendaId, tiendaNombre, pendingProduct);
                setPendingProduct(null);
              }}
            >
              {t("marketplace.switchStoreConfirm")}
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
    header: {
      paddingHorizontal: 16,
      paddingBottom: 10,
    },
    searchbar: {
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 12,
      minHeight: 48,
    },
    searchInput: {
      minHeight: 48,
    },
    areas: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 8,
    },
    areaChip: {
      backgroundColor: theme.colors.surface,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    listContent: {
      paddingHorizontal: 16,
      flexGrow: 1,
    },
    column: {
      gap: 12,
      marginBottom: 12,
    },
    empty: {
      flex: 1,
      paddingHorizontal: 32,
      paddingTop: 64,
    },
    footer: {
      paddingVertical: 20,
      alignItems: "center",
    },
    cartBar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 16,
      paddingTop: 12,
      backgroundColor: theme.colors.surface,
      borderTopWidth: theme.custom.hairline,
      borderTopColor: theme.colors.outlineVariant,
    },
    cartButtonContent: {
      height: 52,
    },
  });

export default StoreCatalogScreen;
