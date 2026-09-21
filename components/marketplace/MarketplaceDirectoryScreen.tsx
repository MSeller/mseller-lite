import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { ActivityIndicator, Appbar, Banner, Button, Searchbar, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import type { CustomTheme } from "../../constants/Theme";
import { usePagedSearch, type SearchPage } from "../../hooks/usePagedSearch";
import { useTranslation } from "../../hooks/useTranslation";
import { listStores } from "../../services/b2bService";
import type { TiendaMarketplace } from "../../types/b2b";
import { describeB2BError } from "../../utils/b2b";
import EmptyState from "../ui/EmptyState";
import { useBottomTabOverflow } from "../ui/TabBarBackground";
import StoreRow from "./StoreRow";

const PAGE_SIZE = 20;

const fetchPage = async (
  busqueda: string,
  page: number
): Promise<SearchPage<TiendaMarketplace>> => {
  const result = await listStores({ busqueda, pageNumber: page, pageSize: PAGE_SIZE });
  return { items: result.items, hasMore: result.hasNextPage };
};

/**
 * The marketplace directory: every supplier store this buyer can reach.
 *
 * The screen is deliberately readable without a link — a colmado that has not been given
 * a code yet should still see who is on the marketplace, and each row says what to do
 * next about that particular store.
 */
const MarketplaceDirectoryScreen: React.FC = () => {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();
  // iOS draws the tab bar over the list; this is how much of the bottom it covers.
  const tabOverflow = useBottomTabOverflow();

  const [search, setSearch] = useState("");
  const results = usePagedSearch<TiendaMarketplace>({ query: search, fetchPage });
  const { items, loading, refreshing, loadingMore, hasMore, error, refresh, loadMore, retry } =
    results;

  const failure = error ? describeB2BError(error) : null;
  const searching = !!search.trim();

  const openCatalog = useCallback(
    (tienda: TiendaMarketplace) =>
      router.push({
        pathname: "/marketplace/[tiendaId]/catalogo",
        params: { tiendaId: tienda.id, nombre: tienda.nombre },
      }),
    [router]
  );

  const renderItem = useCallback(
    ({ item }: { item: TiendaMarketplace }) => (
      <StoreRow
        tienda={item}
        onOpen={() => openCatalog(item)}
        onRedeem={() =>
          router.push({
            pathname: "/marketplace/canjear",
            params: { tiendaId: item.id, nombre: item.nombre },
          })
        }
        onRequest={() =>
          router.push({
            pathname: "/marketplace/solicitar",
            params: { tiendaId: item.id, nombre: item.nombre },
          })
        }
      />
    ),
    [openCatalog, router]
  );

  // A failed next page keeps the rows already on screen, so it gets its own wording.
  const errorMessage = failure
    ? items.length > 0
      ? t("marketplace.errors.loadMoreFailed")
      : failure.message || t("marketplace.errors.storesFailed")
    : "";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Appbar.Header mode="small" style={styles.appbar}>
        <Appbar.Content title={t("marketplace.title")} />
        <Appbar.Action
          icon="ticket-confirmation-outline"
          accessibilityLabel={t("marketplace.redeemCode")}
          onPress={() => router.push("/marketplace/canjear")}
        />
        <Appbar.Action
          icon="clipboard-text-clock-outline"
          accessibilityLabel={t("marketplace.myRequests")}
          onPress={() => router.push("/marketplace/solicitudes")}
        />
      </Appbar.Header>

      <View style={styles.header}>
        <Searchbar
          value={search}
          onChangeText={setSearch}
          placeholder={t("marketplace.searchStores")}
          style={styles.searchbar}
          inputStyle={styles.searchInput}
          returnKeyType="search"
          autoCorrect={false}
        />
      </View>

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
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: 32 + tabOverflow }]}
          ItemSeparatorComponent={Separator}
          ListEmptyComponent={
            failure ? null : (
              <EmptyState
                icon="storefront-outline"
                title={searching ? t("marketplace.noStoresFoundTitle") : t("marketplace.emptyTitle")}
                message={searching ? t("marketplace.noStoresFoundBody") : t("marketplace.emptyBody")}
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
    </SafeAreaView>
  );
};

const Separator = () => <View style={{ height: 10 }} />;

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
      paddingBottom: 12,
    },
    searchbar: {
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 12,
      minHeight: 48,
    },
    searchInput: {
      minHeight: 48,
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
    empty: {
      flex: 1,
      paddingHorizontal: 32,
      paddingTop: 64,
    },
    footer: {
      paddingVertical: 20,
      alignItems: "center",
    },
  });

export default MarketplaceDirectoryScreen;
