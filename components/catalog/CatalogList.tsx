import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { ActivityIndicator, Banner, Button, Icon, Searchbar, Text, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import type { CustomTheme } from "../../constants/Theme";
import { useTranslation } from "../../hooks/useTranslation";
import { describeCatalogError } from "../../utils/catalogValidation";
import { useBottomTabOverflow } from "../ui/TabBarBackground";
import CatalogLockedState from "./CatalogLockedState";

export const CATALOG_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;

export interface CatalogPage<T> {
  items: T[];
  hasMore: boolean;
}

/** A change to one row, applied in place after a save. A new object re-applies. */
export interface CatalogListPatch<T> {
  key: string;
  apply: (item: T) => T;
}

interface Props<T> {
  /** Loads one page. `page` is 1-based here; adapters convert for 0-based endpoints. */
  fetchPage: (query: string, page: number) => Promise<CatalogPage<T>>;
  keyExtractor: (item: T) => string;
  renderRow: (item: T) => React.ReactElement;
  searchPlaceholder: string;
  emptyIcon: string;
  emptyTitle: string;
  emptyBody: string;
  emptySearchTitle: string;
  emptySearchBody: string;
  headerAccessory?: React.ReactNode;
  patch?: CatalogListPatch<T> | null;
}

/**
 * The searchable, paged list behind both Catálogo sections.
 *
 * Search is debounced so typing a name does not fire a request per keystroke, and
 * every request carries a generation number: a slow page for an old query cannot
 * land after the new one and repopulate the list with rows that no longer match.
 */
export default function CatalogList<T>({
  fetchPage,
  keyExtractor,
  renderRow,
  searchPlaceholder,
  emptyIcon,
  emptyTitle,
  emptyBody,
  emptySearchTitle,
  emptySearchBody,
  headerAccessory,
  patch,
}: Props<T>) {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  // iOS draws the tab bar over the list; this is how much of the bottom it covers.
  const tabOverflow = useBottomTabOverflow();

  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState<{ message: string | null } | null>(null);

  const generation = useRef(0);

  useEffect(() => {
    const handle = setTimeout(() => setQuery(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [search]);

  const load = useCallback(
    async (pageNumber: number, append: boolean) => {
      const mine = ++generation.current;
      try {
        const result = await fetchPage(query, pageNumber);
        if (generation.current !== mine) return;
        setItems((current) => (append ? [...current, ...result.items] : result.items));
        setHasMore(result.hasMore);
        setPage(pageNumber);
        setError("");
        setForbidden(null);
      } catch (e) {
        if (generation.current !== mine) return;
        const failure = describeCatalogError(e);
        if (failure.kind === "forbidden") {
          setForbidden({ message: failure.message });
          setItems([]);
          return;
        }
        // A failed "load more" keeps what the user is already reading.
        if (!append) setItems([]);
        setError(append ? t("catalog.loadMoreFailed") : failure.message || t("catalog.loadFailed"));
      }
    },
    [fetchPage, query, t]
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    load(1, false).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [load]);

  useEffect(() => {
    if (!patch) return;
    setItems((current) =>
      current.map((item) => (keyExtractor(item) === patch.key ? patch.apply(item) : item))
    );
  }, [patch, keyExtractor]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(1, false);
    setRefreshing(false);
  }, [load]);

  const fetchMore = useCallback(async () => {
    setLoadingMore(true);
    await load(page + 1, true);
    setLoadingMore(false);
  }, [load, page]);

  // Stops at a failure: onEndReached fires repeatedly near the bottom, and retrying a
  // broken page in a loop is the user's call, made from the retry action.
  const handleLoadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore || error) return;
    fetchMore();
  }, [loading, loadingMore, hasMore, error, fetchMore]);

  const handleRetry = useCallback(() => {
    if (items.length > 0 && hasMore) {
      setError("");
      fetchMore();
    } else {
      handleRefresh();
    }
  }, [items.length, hasMore, fetchMore, handleRefresh]);

  const renderItem = useCallback(({ item }: { item: T }) => renderRow(item), [renderRow]);

  const listEmpty =
    loading || error ? null : (
      <View style={styles.emptyState}>
        <Icon source={emptyIcon} size={56} color={theme.colors.onSurfaceVariant} />
        <Text variant="titleMedium" style={styles.emptyTitle}>
          {query ? emptySearchTitle : emptyTitle}
        </Text>
        <Text variant="bodyMedium" style={styles.emptyBody}>
          {query ? emptySearchBody : emptyBody}
        </Text>
      </View>
    );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {headerAccessory}
      {forbidden ? (
        <CatalogLockedState message={forbidden.message} />
      ) : (
        <>
          <View style={styles.header}>
            <Searchbar
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={() => setQuery(search.trim())}
              placeholder={searchPlaceholder}
              style={styles.searchbar}
              inputStyle={styles.searchInput}
              returnKeyType="search"
              autoCorrect={false}
            />
          </View>

          {!!error && (
            <Banner
              visible
              icon="wifi-off"
              actions={[{ label: t("catalog.retry"), onPress: handleRetry }]}
            >
              {error}
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
              ListEmptyComponent={listEmpty}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.4}
              ListFooterComponent={
                loadingMore ? (
                  <View style={styles.footer}>
                    <ActivityIndicator />
                  </View>
                ) : hasMore && !!error ? (
                  <View style={styles.footer}>
                    <Button mode="text" onPress={handleRetry}>
                      {t("catalog.retry")}
                    </Button>
                  </View>
                ) : null
              }
            />
          )}
        </>
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
      paddingBottom: 32,
      flexGrow: 1,
    },
    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
      paddingTop: 64,
      gap: 8,
    },
    emptyTitle: {
      color: theme.colors.onSurface,
      fontWeight: "600",
      textAlign: "center",
    },
    emptyBody: {
      color: theme.colors.onSurfaceVariant,
      textAlign: "center",
    },
    footer: {
      paddingVertical: 20,
      alignItems: "center",
    },
  });
