import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Banner,
  Button,
  Chip,
  Icon,
  Text,
  useTheme,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import type { CustomTheme } from "../../constants/Theme";
import { usePagedSearch, type SearchPage } from "../../hooks/usePagedSearch";
import { useTranslation } from "../../hooks/useTranslation";
import { listPurchaseRequests } from "../../services/b2bService";
import type { EstadoSolicitud, SolicitudB2B } from "../../types/b2b";
import { describeB2BError, solicitudTone } from "../../utils/b2b";
import { formatDateTime, formatMoney } from "../../utils/documentFormat";
import AppCard from "../ui/AppCard";
import EmptyState from "../ui/EmptyState";
import StatusChip from "../ui/StatusChip";

const PAGE_SIZE = 20;
const STATES: EstadoSolicitud[] = ["enviada", "aceptada", "rechazada", "cancelada"];

/**
 * Every purchase request this buyer has sent.
 *
 * Filtered server-side by state, not locally: the list is paged, so filtering the loaded
 * page would show "3 accepted" when there are thirty.
 */
const RequestsListScreen: React.FC = () => {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();

  const [estado, setEstado] = useState<EstadoSolicitud | null>(null);

  const fetchPage = useCallback(
    async (_query: string, page: number): Promise<SearchPage<SolicitudB2B>> => {
      const result = await listPurchaseRequests({
        estado: estado ?? undefined,
        pageNumber: page,
        pageSize: PAGE_SIZE,
      });
      return { items: result.items, hasMore: result.hasNextPage };
    },
    [estado]
  );

  // There is no search box here, so the debounce is off: the list should reload the
  // moment a state chip is tapped.
  const results = usePagedSearch<SolicitudB2B>({ query: "", fetchPage, debounceMs: 0 });
  const { items, loading, refreshing, loadingMore, hasMore, error, refresh, loadMore, retry } =
    results;

  const failure = error ? describeB2BError(error) : null;

  const renderItem = useCallback(
    ({ item }: { item: SolicitudB2B }) => {
      // The order number only exists once the supplier accepted, so it is painted in the
      // same tone as the state chip: the two read as one outcome rather than as two
      // unrelated scraps of text.
      const tone = theme.custom.status[solicitudTone(item.estado)];

      return (
        <AppCard
          onPress={() =>
            router.push({
              pathname: "/marketplace/solicitudes/[noSolicitud]",
              params: { noSolicitud: item.noSolicitud },
            })
          }
        >
          <View style={styles.rowContent}>
            {/* The two anchors: which request, and how much it is worth. */}
            <View style={styles.rowHeader}>
              <Text variant="titleMedium" style={styles.number} numberOfLines={1}>
                {item.noSolicitud}
              </Text>
              <Text variant="titleMedium" style={styles.total} numberOfLines={1}>
                {item.precioOculto ? t("marketplace.priceHiddenLabel") : formatMoney(item.total ?? 0)}
              </Text>
            </View>

            <Text variant="bodySmall" style={styles.meta} numberOfLines={1}>
              {item.tiendaNombre} · {formatDateTime(item.creadoEn)}
            </Text>

            <View style={styles.rowFooter}>
              <StatusChip
                label={t(`marketplace.requestState.${item.estado}`)}
                tone={solicitudTone(item.estado)}
              />
              {!!item.noPedidoStr && (
                <View style={styles.orderRef}>
                  <Icon source="receipt-text-check-outline" size={15} color={tone.base} />
                  <Text variant="bodySmall" style={[styles.orderText, { color: tone.base }]}>
                    {t("marketplace.orderNumber", { value: item.noPedidoStr })}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </AppCard>
      );
    },
    [router, styles, t, theme]
  );

  const errorMessage = failure
    ? items.length > 0
      ? t("marketplace.errors.loadMoreFailed")
      : failure.message || t("marketplace.errors.requestsFailed")
    : "";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Appbar.Header mode="small" style={styles.appbar}>
        <Appbar.BackAction
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/(tabs)/marketplace")
          }
        />
        <Appbar.Content title={t("marketplace.myRequests")} />
      </Appbar.Header>

      {/* Sin `flexGrow: 0` el ScrollView horizontal se reparte el alto disponible dentro
          de la columna flex, y con `alignItems` por defecto (`stretch`) cada chip se
          estira a ese alto: la fila salía como cajas verticales gigantes. El alto lo
          fija el contenido, no el padre. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersRow}
        contentContainerStyle={styles.filters}
      >
        <Chip
          selected={estado === null}
          onPress={() => setEstado(null)}
          style={styles.filterChip}
        >
          {t("marketplace.allRequests")}
        </Chip>
        {STATES.map((value) => (
          <Chip
            key={value}
            selected={estado === value}
            onPress={() => setEstado(estado === value ? null : value)}
            style={styles.filterChip}
          >
            {t(`marketplace.requestState.${value}`)}
          </Chip>
        ))}
      </ScrollView>

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
          keyExtractor={(item) => item.noSolicitud}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={Separator}
          ListEmptyComponent={
            failure ? null : estado ? (
              // A filter that matched nothing is not the same as never having sent a
              // request: say which filter is hiding everything.
              <EmptyState
                icon="filter-remove-outline"
                title={t("marketplace.noFilteredRequestsTitle")}
                message={t("marketplace.noFilteredRequestsBody", {
                  estado: t(`marketplace.requestState.${estado}`),
                })}
                style={styles.empty}
              />
            ) : (
              <EmptyState
                icon="clipboard-text-outline"
                title={t("marketplace.noRequestsTitle")}
                message={t("marketplace.noRequestsBody")}
                style={styles.empty}
              />
            )
          }
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
    filtersRow: {
      flexGrow: 0,
      flexShrink: 0,
    },
    filters: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      paddingTop: 4,
      gap: 8,
      alignItems: "center",
    },
    filterChip: {
      backgroundColor: theme.colors.surface,
      // One-handed use: a 32dp Material chip is below the 44px minimum target.
      height: 44,
      justifyContent: "center",
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 32,
      flexGrow: 1,
    },
    rowContent: {
      paddingVertical: 14,
      paddingHorizontal: 14,
      gap: 6,
      // The whole card is the tap target; keep it comfortably above 44px.
      minHeight: 96,
      justifyContent: "center",
    },
    rowHeader: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: 12,
    },
    number: {
      flex: 1,
      color: theme.colors.onSurface,
      fontWeight: "700",
      letterSpacing: 0.3,
    },
    meta: {
      color: theme.colors.onSurfaceVariant,
    },
    total: {
      color: theme.colors.onSurface,
      fontWeight: "700",
    },
    rowFooter: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap",
      marginTop: 4,
    },
    orderRef: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    orderText: {
      fontWeight: "700",
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

export default RequestsListScreen;
