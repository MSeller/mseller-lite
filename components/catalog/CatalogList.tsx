import React, { useCallback, useMemo } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { ActivityIndicator, Banner, Button, Searchbar, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import type { CustomTheme } from "../../constants/Theme";
import type { PagedSearch } from "../../hooks/usePagedSearch";
import { useTranslation } from "../../hooks/useTranslation";
import { describeCatalogError } from "../../utils/catalogValidation";
import EmptyState from "../ui/EmptyState";
import { useBottomTabOverflow } from "../ui/TabBarBackground";
import CatalogLockedState from "./CatalogLockedState";

export const CATALOG_PAGE_SIZE = 20;

interface Props<T> {
  search: string;
  onSearchChange: (text: string) => void;
  /** The screen's `usePagedSearch` state; the screen keeps it so it can patch rows after a save. */
  results: PagedSearch<T>;
  keyExtractor: (item: T) => string;
  renderRow: (item: T) => React.ReactElement;
  searchPlaceholder: string;
  emptyIcon: string;
  emptyTitle: string;
  emptyBody: string;
  emptySearchTitle: string;
  emptySearchBody: string;
  headerAccessory?: React.ReactNode;
}

/**
 * The searchable, paged list behind both Catálogo sections: a search box over
 * `usePagedSearch` results, with pull-to-refresh, infinite paging and the loading,
 * empty, failed and locked (403) states.
 */
export default function CatalogList<T>({
  search,
  onSearchChange,
  results,
  keyExtractor,
  renderRow,
  searchPlaceholder,
  emptyIcon,
  emptyTitle,
  emptyBody,
  emptySearchTitle,
  emptySearchBody,
  headerAccessory,
}: Props<T>) {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  // iOS draws the tab bar over the list; this is how much of the bottom it covers.
  const tabOverflow = useBottomTabOverflow();

  const { items, loading, refreshing, loadingMore, hasMore, error, refresh, loadMore, retry } = results;
  const failure = error ? describeCatalogError(error) : null;
  const searching = !!search.trim();

  const renderItem = useCallback(({ item }: { item: T }) => renderRow(item), [renderRow]);

  if (failure?.kind === "forbidden") {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        {headerAccessory}
        <CatalogLockedState message={failure.message} />
      </SafeAreaView>
    );
  }

  // A failed next page keeps the rows already loaded, so it gets its own wording.
  const errorMessage = failure
    ? items.length > 0
      ? t("catalog.loadMoreFailed")
      : failure.message || t("catalog.loadFailed")
    : "";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {headerAccessory}
      <View style={styles.header}>
        <Searchbar
          value={search}
          onChangeText={onSearchChange}
          placeholder={searchPlaceholder}
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
        <View style={styles.loading}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: 32 + tabOverflow }]}
          ItemSeparatorComponent={Separator}
          ListEmptyComponent={
            failure ? null : (
              <EmptyState
                icon={emptyIcon}
                title={searching ? emptySearchTitle : emptyTitle}
                message={searching ? emptySearchBody : emptyBody}
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
}

const Separator = () => <View style={{ height: 10 }} />;

const createStyles = (theme: CustomTheme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingHorizontal: 16,
      paddingTop: 8,
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
    loading: {
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
