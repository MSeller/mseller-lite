import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Banner,
  Card,
  Divider,
  FAB,
  Icon,
  Searchbar,
  SegmentedButtons,
  Text,
  useTheme,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import type { CustomTheme } from "../../constants/Theme";
import { useTranslation } from "../../hooks/useTranslation";
import { listDocuments } from "../../services/documentService";
import type { DocumentSummary, DocumentType } from "../../types/documents";
import { formatDateShort, formatMoney } from "../../utils/documentFormat";
import DocumentStatusChip from "./DocumentStatusChip";
import { getDocumentTypeMeta } from "./documentMeta";

const PAGE_SIZE = 20;

type TypeFilter = "all" | DocumentType;

/**
 * The documents this user has captured, newest first.
 *
 * Online only, like the rest of the capture flow: when the network is gone the
 * screen says so and offers a retry rather than showing a stale local copy that
 * does not exist on the server.
 */
const DocumentsListScreen: React.FC = () => {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();

  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const fetchPage = useCallback(
    async (pageNumber: number, { append }: { append: boolean }) => {
      try {
        const result = await listDocuments({
          tipoDocumento: typeFilter === "all" ? undefined : typeFilter,
          query: appliedSearch || undefined,
          pageNumber,
          pageSize: PAGE_SIZE,
        });

        setDocuments((current) =>
          append ? [...current, ...(result.items ?? [])] : result.items ?? []
        );
        setHasMore(result.hasNextPage ?? false);
        setPage(result.pageNumber ?? pageNumber);
        setError("");
      } catch (e: any) {
        // Only blank the list on a first load — a failed "load more" should not
        // throw away what the user is already reading.
        if (!append) setDocuments([]);
        setError(
          e?.response?.status === 403
            ? t("documents.errors.forbidden")
            : t("documents.errors.loadFailed")
        );
      }
    },
    [typeFilter, appliedSearch, t]
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchPage(1, { append: false }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [fetchPage]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPage(1, { append: false });
    setRefreshing(false);
  }, [fetchPage]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    await fetchPage(page + 1, { append: true });
    setLoadingMore(false);
  }, [loadingMore, hasMore, loading, page, fetchPage]);

  const renderItem = useCallback(
    ({ item }: { item: DocumentSummary }) => {
      const meta = getDocumentTypeMeta(item.tipoDocumento);
      const accent = theme.colors[meta.accent];

      return (
        <Card
          style={styles.card}
          mode="elevated"
          onPress={() => router.push(`/documentos/${encodeURIComponent(item.noPedidoStr)}`)}
        >
          <Card.Content style={styles.cardContent}>
            <View style={[styles.typeBadge, { backgroundColor: `${accent}1A` }]}>
              <Icon source={meta.icon} size={22} color={accent} />
            </View>

            <View style={styles.cardBody}>
              <View style={styles.cardTopRow}>
                <Text variant="titleMedium" style={styles.docNumber} numberOfLines={1}>
                  {item.noPedidoStr}
                </Text>
                <Text variant="titleMedium" style={styles.total}>
                  {formatMoney(item.total)}
                </Text>
              </View>

              <Text variant="bodyMedium" style={styles.customer} numberOfLines={1}>
                {item.nombreCliente || item.codigoCliente || t("documents.noCustomer")}
              </Text>

              <View style={styles.cardBottomRow}>
                <DocumentStatusChip procesado={item.procesado} anulado={item.anulado} />
                <Text variant="bodySmall" style={styles.meta}>
                  {t(meta.labelKey)} · {formatDateShort(item.fecha)} ·{" "}
                  {t("documents.lineCount", { count: item.cantidadLineas })}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      );
    },
    [theme, styles, router, t]
  );

  const listEmpty = useMemo(() => {
    if (loading) return null;
    return (
      <View style={styles.emptyState}>
        <Icon source="file-document-outline" size={56} color={theme.colors.onSurfaceVariant} />
        <Text variant="titleMedium" style={styles.emptyTitle}>
          {appliedSearch ? t("documents.emptySearchTitle") : t("documents.emptyTitle")}
        </Text>
        <Text variant="bodyMedium" style={styles.emptyBody}>
          {appliedSearch ? t("documents.emptySearchBody") : t("documents.emptyBody")}
        </Text>
      </View>
    );
  }, [loading, appliedSearch, styles, theme, t]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          {t("documents.title")}
        </Text>

        <Searchbar
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => setAppliedSearch(search.trim())}
          onIconPress={() => setAppliedSearch(search.trim())}
          onClearIconPress={() => setAppliedSearch("")}
          placeholder={t("documents.searchPlaceholder")}
          style={styles.searchbar}
          inputStyle={styles.searchInput}
          returnKeyType="search"
        />

        <SegmentedButtons
          value={typeFilter}
          onValueChange={(value) => setTypeFilter(value as TypeFilter)}
          density="medium"
          style={styles.filters}
          buttons={[
            { value: "all", label: t("documents.filter.all") },
            { value: "invoice", label: t("documents.type.invoice") },
            { value: "order", label: t("documents.type.order") },
            { value: "quote", label: t("documents.type.quote") },
          ]}
        />
      </View>

      {!!error && (
        <Banner
          visible
          icon="wifi-off"
          actions={[{ label: t("common.retry"), onPress: handleRefresh }]}
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
          data={documents}
          keyExtractor={(item) => item.noPedidoStr}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={listEmpty}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator />
              </View>
            ) : null
          }
        />
      )}

      <Divider />

      <FAB
        icon="plus"
        label={t("documents.newDocument")}
        style={styles.fab}
        onPress={() => router.push("/documentos/nuevo")}
      />
    </SafeAreaView>
  );
};

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
      gap: 12,
    },
    title: {
      fontWeight: "700",
      color: theme.colors.onBackground,
    },
    searchbar: {
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 12,
      // Comfortable target for a thumb, not a desktop pointer.
      minHeight: 48,
    },
    searchInput: {
      minHeight: 48,
    },
    filters: {
      marginTop: 2,
    },
    loading: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    listContent: {
      paddingHorizontal: 16,
      // Clears the FAB so the last row is never trapped underneath it.
      paddingBottom: 120,
      flexGrow: 1,
    },
    separator: {
      height: 10,
    },
    card: {
      borderRadius: 14,
      backgroundColor: theme.colors.surface,
    },
    cardContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 14,
    },
    typeBadge: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    cardBody: {
      flex: 1,
      gap: 4,
    },
    cardTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    docNumber: {
      fontWeight: "700",
      color: theme.colors.onSurface,
      flexShrink: 1,
    },
    total: {
      fontWeight: "700",
      color: theme.colors.onSurface,
    },
    customer: {
      color: theme.colors.onSurfaceVariant,
    },
    cardBottomRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      flexWrap: "wrap",
      marginTop: 2,
    },
    meta: {
      color: theme.colors.onSurfaceVariant,
      flexShrink: 1,
      textAlign: "right",
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
    footerLoading: {
      paddingVertical: 20,
    },
    fab: {
      position: "absolute",
      right: 16,
      bottom: 24,
      borderRadius: 16,
    },
  });

export default DocumentsListScreen;
