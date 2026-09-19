import { useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Card,
  Divider,
  Icon,
  ProgressBar,
  Snackbar,
  Text,
  useTheme,
} from "react-native-paper";

import type { CustomTheme, StatusTokens } from "@/constants/Theme";
import { useTranslation } from "@/hooks/useTranslation";
import EmptyState from "../../../components/ui/EmptyState";
import StatusChip from "../../../components/ui/StatusChip";
import SectionAccessGate from "../../../components/navigation/SectionAccessGate";
import { preparacionService } from "../../../services/preparacionService";
import type { TipoVehiculo } from "../../../types/entrega";
import { CargaCliente, CargaResponse } from "../../../types/preparacion";
import {
  FacturacionFlags,
  estadoFacturacion,
  isEsperandoFacturacion,
  resumenCarga,
  type FaseCarga,
} from "../../../utils/routeLoading";
import { vehiculoLabel } from "../../../utils/mapLinks";

const faseTone: Record<FaseCarga, keyof StatusTokens> = {
  esperando: "neutral",
  generadas: "warning",
  asignadas: "neutral",
  cargando: "warning",
  completa: "positive",
};

/**
 * Preparación › Carga — the office's READ-ONLY view of a route's truck load (MSE-255).
 *
 * Only the driver loads the truck (Rutas › Entregas › Cargar camión) and only once the
 * office has generated and assigned the invoices. Here office/manager/admin follow that
 * progress: invoicing state first, then per-invoice loaded / with issue / pending.
 * Invoices the driver declined leave the route (status excluido) and are not listed.
 */
function LoadingScreen() {
  const theme = useTheme() as CustomTheme;
  const { t } = useTranslation();
  const { rutaId } = useLocalSearchParams<{ rutaId: string }>();
  const numericRutaId = parseInt(rutaId ?? "0", 10);

  const [data, setData] = useState<CargaResponse | null>(null);
  // Set while the backend answers 409 ESPERANDO_FACTURACION: the carga is not released yet.
  const [waiting, setWaiting] = useState<FacturacionFlags | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  /** The 409 carries no flags; the route list tells generated-but-unassigned apart. */
  const loadWaitingFlags = useCallback(async (): Promise<FacturacionFlags> => {
    try {
      const rutas = await preparacionService.getRutasPreparacion();
      const ruta = rutas.find((r) => r.rutaId === numericRutaId);
      return {
        facturasGeneradas: ruta?.facturasGeneradas ?? false,
        facturasAsignadas: false,
      };
    } catch {
      return { facturasGeneradas: false, facturasAsignadas: false };
    }
  }, [numericRutaId]);

  const loadCarga = useCallback(async () => {
    try {
      setError("");
      const response = await preparacionService.getCarga(numericRutaId);
      setData(response);
      setWaiting(null);
    } catch (err: unknown) {
      if (isEsperandoFacturacion(err)) {
        setData(null);
        setWaiting(await loadWaitingFlags());
        return;
      }
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message || e.message || t("preparacion.errorLoadingCarga"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [numericRutaId, t, loadWaitingFlags]);

  // Read-only and changed by someone else (the driver): refresh whenever the tab is shown.
  useFocusEffect(
    useCallback(() => {
      loadCarga();
    }, [loadCarga])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadCarga();
  }, [loadCarga]);

  const renderCard = ({ item }: { item: CargaCliente }) => {
    const isExpanded = expandedId === item.rutaDetalleId;
    const productos = item.productos ?? [];
    const tone: keyof StatusTokens = item.confirmado ? (item.conIncidencia ? "warning" : "positive") : "neutral";
    const colors = theme.custom.status[tone];
    const label = item.confirmado
      ? item.conIncidencia ? t("preparacion.loadedWithIssueShort") : t("preparacion.loaded")
      : t("preparacion.pending");
    const reason = item.conIncidencia ? item.cargaObservacion : undefined;

    return (
      <Card elevation={0} style={[styles.card, { backgroundColor: theme.colors.surface, borderLeftColor: colors.base }]}>
        <Pressable onPress={() => setExpandedId((p) => (p === item.rutaDetalleId ? null : item.rutaDetalleId))}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.header}>
              <View style={[styles.seqBadge, { backgroundColor: colors.base }]}>
                {item.confirmado ? (
                  <Icon source="check" size={18} color={theme.colors.onPrimary} />
                ) : (
                  <Text style={[styles.seqText, { color: theme.colors.onPrimary }]}>{item.secuenciaEntrega}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={{ fontWeight: "bold", color: theme.colors.onSurface }} numberOfLines={1}>{item.nombreCliente}</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>{item.codigoCliente}</Text>
                {!!item.direccion && (
                  <View style={styles.addrRow}>
                    <Icon source="map-marker" size={14} color={theme.colors.onSurfaceVariant} />
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 3, flex: 1 }} numberOfLines={2}>{item.direccion}</Text>
                  </View>
                )}
              </View>
              <StatusChip label={label} tone={tone} />
            </View>
            <View style={styles.metaRow}>
              <Icon source="file-document-outline" size={18} color={theme.colors.primary} />
              <Text style={[styles.invoiceText, { color: theme.colors.primary }]} numberOfLines={1}>{item.noFactura}</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 8, flex: 1 }} numberOfLines={1}>· {productos.length} {t("preparacion.items")}</Text>
              <Icon source={isExpanded ? "chevron-up" : "chevron-down"} size={22} color={theme.colors.onSurfaceVariant} />
            </View>
            {!!reason && (
              <View style={[styles.reasonBox, { backgroundColor: colors.container }]}>
                <Icon source="alert-circle-outline" size={14} color={colors.onContainer} />
                <Text variant="bodySmall" style={{ color: colors.onContainer, marginLeft: 4, flex: 1 }}>{reason}</Text>
              </View>
            )}
          </Card.Content>
        </Pressable>

        {isExpanded && (
          <Card.Content style={styles.cardContentExpanded}>
            <Divider style={styles.cardDivider} />
            <Text style={[styles.sectionLabel, { color: theme.colors.primary }]}>{t("preparacion.invoiceDetailsLabel")}</Text>
            {productos.map((prod, idx) => (
              <View key={`${prod.codigoProducto}-${idx}`} style={[styles.itemRow, { backgroundColor: theme.colors.surfaceVariant }]}>
                <View style={styles.itemInfo}>
                  <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: "700" }} numberOfLines={2}>
                    {prod.descripcion || prod.codigoProducto}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }} numberOfLines={1}>{prod.codigoProducto}</Text>
                </View>
                <View style={styles.qtyBox}>
                  <Text style={[styles.qtyNum, { color: theme.colors.onSurface }]}>{prod.cantidad}</Text>
                  {!!prod.unidad && <Text style={[styles.qtyUnit, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>{prod.unidad}</Text>}
                </View>
              </View>
            ))}
          </Card.Content>
        )}
      </Card>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={{ marginTop: 16, color: theme.colors.onSurfaceVariant }}>{t("preparacion.loadingData")}</Text>
      </SafeAreaView>
    );
  }

  if (waiting) {
    const estado = estadoFacturacion(waiting);
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={["left", "right"]}>
        <ScrollView
          contentContainerStyle={styles.waitingContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          <EmptyState
            icon={estado === "generadas" ? "file-document-check-outline" : "file-clock-outline"}
            title={t(`routeLoading.phase.${estado}`)}
            message={t("routeLoading.officeWaitingMessage")}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const sorted = [...(data?.clientes ?? [])].sort((a, b) => b.secuenciaEntrega - a.secuenciaEntrega);
  const resumen = data ? resumenCarga(data) : { fase: "asignadas" as FaseCarga, cargados: 0, total: 0 };
  const faseColors = theme.custom.status[faseTone[resumen.fase]];
  const showProgress = resumen.fase === "asignadas" || resumen.fase === "cargando" || resumen.fase === "completa";
  const veh = data ? [vehiculoLabel(data.vehiculoTipo as TipoVehiculo | null), data.vehiculoPlaca].filter(Boolean).join(" · ") : "";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={["left", "right"]}>
      <View style={[styles.statusCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
        <View style={styles.statusHeaderRow}>
          <Text style={[styles.statusTitle, { color: faseColors.base }]} numberOfLines={2}>
            {t(`routeLoading.phase.${resumen.fase}`, { loaded: resumen.cargados, total: resumen.total })}
          </Text>
          {showProgress && (
            <Text style={[styles.progressMetric, { color: theme.colors.onSurfaceVariant }]}>
              {t("preparacion.loadingClientsShort", { loaded: resumen.cargados, total: resumen.total })}
            </Text>
          )}
        </View>
        {showProgress && (
          <ProgressBar
            progress={resumen.total > 0 ? resumen.cargados / resumen.total : 0}
            color={resumen.fase === "completa" ? theme.custom.status.positive.base : theme.colors.primary}
            style={styles.progressBar}
          />
        )}
        {!!veh && (
          <View style={styles.infoRow}>
            <Icon source="truck" size={16} color={theme.colors.primary} />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurface, marginLeft: 6 }}>{veh}</Text>
          </View>
        )}
        <View style={styles.infoRow}>
          <Icon source="eye-outline" size={16} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 6, flex: 1 }}>{t("routeLoading.readOnlyHint")}</Text>
        </View>
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(item) => String(item.rutaDetalleId ?? `${item.codigoCliente}-${item.secuenciaEntrega}`)}
        renderItem={renderCard}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      <Snackbar visible={!!error} onDismiss={() => setError("")} duration={4000} action={{ label: t("common.retry"), onPress: () => { setError(""); loadCarga(); } }}>{error}</Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  waitingContent: { flexGrow: 1, justifyContent: "center", padding: 32 },
  statusCard: { marginHorizontal: 16, marginTop: 12, marginBottom: 4, padding: 16, borderRadius: 6, borderWidth: 1, gap: 10 },
  statusHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  statusTitle: { flex: 1, fontSize: 15, fontWeight: "800" },
  progressMetric: { fontSize: 12, fontWeight: "700", letterSpacing: 0.4, textTransform: "uppercase" },
  progressBar: { height: 8, borderRadius: 4 },
  infoRow: { flexDirection: "row", alignItems: "center" },
  listContent: { padding: 16, paddingBottom: 120 },
  separator: { height: 10 },
  card: { borderRadius: 6, borderLeftWidth: 5 },
  cardContent: { paddingVertical: 14, paddingHorizontal: 16 },
  cardContentExpanded: { paddingTop: 2, paddingBottom: 16, paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  seqBadge: { width: 38, height: 38, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  seqText: { fontWeight: "800", fontSize: 15 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  addrRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 3 },
  invoiceText: { fontSize: 16, fontWeight: "800", letterSpacing: 0.3, marginLeft: 6 },
  reasonBox: { flexDirection: "row", alignItems: "flex-start", marginTop: 8, padding: 8, borderRadius: 6 },
  cardDivider: { marginTop: 12, marginBottom: 10 },
  sectionLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 },
  itemRow: { flexDirection: "row", alignItems: "center", borderRadius: 6, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 8, minHeight: 56 },
  itemInfo: { flex: 1, marginRight: 8 },
  qtyBox: { minWidth: 48, alignItems: "center", justifyContent: "center", paddingLeft: 8 },
  qtyNum: { fontSize: 22, fontWeight: "800", lineHeight: 24 },
  qtyUnit: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", marginTop: 1 },
});

export default function LoadingScreenRoute() {
  const { t } = useTranslation();
  return (
    <SectionAccessGate section="truckLoading" message={t("preparacion.loadingNotAllowed")}>
      <LoadingScreen />
    </SectionAccessGate>
  );
}
