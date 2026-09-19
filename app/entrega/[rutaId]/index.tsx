import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Dialog,
  Divider,
  Icon,
  IconButton,
  Portal,
  ProgressBar,
  Snackbar,
  Text,
  useTheme,
} from "react-native-paper";
import type { CustomTheme } from "@/constants/Theme";
import { useTranslation } from "@/hooks/useTranslation";
import { entregaService } from "../../../services/entregaService";
import {
  EntregaFacturaResumen,
  EntregaRutaDetalle,
  RutaDetalleStatus,
} from "../../../types/entrega";
import {
  MapDestination,
  hasCoords,
  mapProviderOptions,
  openInMaps,
  vehiculoLabel,
} from "../../../utils/mapLinks";
import { cargaHabilitada } from "../../../utils/routeLoading";

const detalleStatus: Record<RutaDetalleStatus, { color: string; bg: string; key: string; icon: string }> = {
  activo: { color: "#F57C00", bg: "#FFF3E0", key: "entrega.detalle.pending", icon: "clock-outline" },
  entregado: { color: "#2E7D32", bg: "#D6EDE3", key: "entrega.detalle.entregado", icon: "check-circle" },
  entregado_con_novedad: { color: "#00897B", bg: "#E0F2F1", key: "entrega.detalle.entregado_con_novedad", icon: "check-decagram" },
  parcial: { color: "#B26A00", bg: "#FFF8E1", key: "entrega.detalle.parcial", icon: "alert-circle-outline" },
  entregar_despues: { color: "#5E35B1", bg: "#EDE7F6", key: "entrega.detalle.entregar_despues", icon: "calendar-clock" },
  no_entregado: { color: "#C62828", bg: "#F8DEDC", key: "entrega.detalle.no_entregado", icon: "close-circle-outline" },
  excluido: { color: "#9E9E9E", bg: "#EDF1F6", key: "entrega.detalle.excluido", icon: "minus-circle-outline" },
  reasignado: { color: "#9E9E9E", bg: "#EDF1F6", key: "entrega.detalle.reasignado", icon: "swap-horizontal" },
};

export default function RutaEntregaDetalleScreen() {
  const theme = useTheme() as CustomTheme;
  const router = useRouter();
  const { t } = useTranslation();
  const { rutaId } = useLocalSearchParams<{ rutaId: string }>();
  const numericRutaId = parseInt(rutaId ?? "0", 10);

  const [data, setData] = useState<EntregaRutaDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState("");
  const [mapTarget, setMapTarget] = useState<MapDestination | null>(null);

  const load = useCallback(async () => {
    try {
      setError("");
      const res = await entregaService.getRuta(numericRutaId);
      setData(res);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || t("entrega.errorLoading"));
    } finally {
      setLoading(false);
    }
  }, [numericRutaId, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const facturas = [...(data?.facturas ?? [])].sort(
    (a, b) => a.secuenciaEntrega - b.secuenciaEntrega
  );
  const total = facturas.length;
  const done = facturas.filter(
    (f) =>
      f.statusDetalle === "entregado" ||
      f.statusDetalle === "parcial" ||
      f.statusDetalle === "entregado_con_novedad"
  ).length;
  const hasPending = facturas.some((f) => f.statusDetalle === "activo");
  const progress = total > 0 ? (total - facturas.filter((f) => f.statusDetalle === "activo").length) / total : 0;

  const isLoadPhase = data?.status === "lista_despacho";
  // The truck is loaded only once the office assigns the invoices to the driver (MSE-255).
  const canLoad = isLoadPhase && cargaHabilitada(data);
  const isEnRuta = data?.status === "en_ruta";

  const handleClose = async () => {
    try {
      setClosing(true);
      setError("");
      await entregaService.completarRuta(numericRutaId);
      router.replace({ pathname: "/(tabs)/routes", params: { section: "deliveries" } });
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || t("entrega.errorClosing"));
    } finally {
      setClosing(false);
    }
  };

  const renderStop = ({ item }: { item: EntregaFacturaResumen }) => {
    const st = detalleStatus[item.statusDetalle] ?? detalleStatus.activo;
    const canNavigate = hasCoords(item);
    return (
      <Card elevation={0}
        style={[styles.stopCard, { backgroundColor: theme.colors.surface, borderLeftColor: st.color }]}
        onPress={() =>
          router.push(
            `/entrega/${numericRutaId}/factura/${encodeURIComponent(item.noPedidoStr)}` as any
          )
        }
      >
        <Card.Content>
          <View style={styles.stopHeader}>
            <View style={styles.seqBadge}>
              <Text style={styles.seqText}>{item.secuenciaEntrega}</Text>
            </View>
            <View style={styles.stopInfo}>
              <Text
                variant="titleSmall"
                style={{ fontWeight: "bold", color: theme.colors.onSurface }}
                numberOfLines={1}
              >
                {item.nombreCliente || item.codigoCliente}
              </Text>
              {!!item.direccion && (
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                  numberOfLines={1}
                >
                  {item.direccion}
                </Text>
              )}
            </View>
            <IconButton
              icon="map-marker"
              size={22}
              mode="contained-tonal"
              disabled={!canNavigate}
              onPress={() =>
                setMapTarget({ latitud: item.latitud, longitud: item.longitud, label: item.nombreCliente })
              }
            />
          </View>
          <View style={styles.stopFooter}>
            <Chip compact style={{ backgroundColor: st.bg }} textStyle={{ color: st.color, fontSize: 11 }} icon={st.icon}>
              {t(st.key)}
            </Chip>
            <Text variant="bodyMedium" style={{ fontWeight: "bold", color: theme.colors.onSurface }}>
              {item.total.toFixed(2)}
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: theme.colors.background }]} edges={["left", "right"]}>
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={{ marginTop: 16, color: theme.colors.onSurfaceVariant }}>
          {t("common.loading")}
        </Text>
      </SafeAreaView>
    );
  }

  const veh = [vehiculoLabel(data?.vehiculoTipo), data?.vehiculoPlaca].filter(Boolean).join(" · ");

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={["left", "right"]}>
      <View style={[styles.summary, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.summaryRow}>
          <Text variant="titleLarge" style={{ fontWeight: "bold", color: theme.colors.onSurface }}>
            {data?.noRuta}
          </Text>
          {!!veh && (
            <View style={styles.vehRow}>
              <Icon source="truck" size={16} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                {veh}
              </Text>
            </View>
          )}
        </View>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
          {done}/{total} {t("entrega.delivered")}
        </Text>
        <ProgressBar
          progress={progress}
          color={progress >= 1 ? "#1F6B54" : theme.colors.primary}
          style={styles.progressBar}
        />
      </View>

      {isLoadPhase && !canLoad && (
        <View style={styles.actionBar}>
          <View style={[styles.waitingBanner, { backgroundColor: theme.custom.status.neutral.container }]}>
            <Icon source="file-clock-outline" size={20} color={theme.custom.status.neutral.onContainer} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text variant="titleSmall" style={{ fontWeight: "700", color: theme.custom.status.neutral.onContainer }}>
                {t("routeLoading.waitingInvoicing")}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.custom.status.neutral.onContainer, marginTop: 2 }}>
                {t("routeLoading.driverWaitingHint")}
              </Text>
            </View>
          </View>
        </View>
      )}

      {canLoad && (
        <View style={styles.actionBar}>
          <Button
            mode="contained"
            icon="truck-fast"
            onPress={() => router.push(`/entrega/${numericRutaId}/carga` as any)}
            contentStyle={{ minHeight: 48 }}
          >
            {t("entrega.loadTruck")}
          </Button>
        </View>
      )}

      <FlatList
        data={facturas}
        keyExtractor={(item) => String(item.rutaDetalleId)}
        renderItem={renderStop}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 40, color: theme.colors.onSurfaceVariant }}>
            {t("entrega.noStops")}
          </Text>
        }
      />

      {isEnRuta && (
        <View style={[styles.closeBar, { backgroundColor: theme.colors.surface }]}>
          <Button
            mode="contained"
            icon="flag-checkered"
            buttonColor="#2E7D32"
            disabled={hasPending || closing || total === 0}
            loading={closing}
            onPress={handleClose}
            contentStyle={{ minHeight: 48 }}
          >
            {t("entrega.closeTransport")}
          </Button>
          {hasPending && (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: "center", marginTop: 6 }}>
              {t("entrega.pendingStopsHint")}
            </Text>
          )}
        </View>
      )}

      <Portal>
        <Dialog visible={!!mapTarget} onDismiss={() => setMapTarget(null)}>
          <Dialog.Title>{t("entrega.openIn")}</Dialog.Title>
          <Dialog.Content>
            <Divider style={{ marginBottom: 8 }} />
            {mapProviderOptions().map((opt) => (
              <Button
                key={opt.provider}
                icon={opt.icon}
                mode="text"
                style={styles.mapOption}
                contentStyle={{ justifyContent: "flex-start" }}
                onPress={async () => {
                  const target = mapTarget;
                  setMapTarget(null);
                  if (target) await openInMaps(opt.provider, target);
                }}
              >
                {opt.label}
              </Button>
            ))}
          </Dialog.Content>
        </Dialog>
      </Portal>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError("")}
        duration={4000}
        action={{ label: t("common.retry"), onPress: () => { setError(""); load(); } }}
      >
        {error}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  summary: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  vehRow: { flexDirection: "row", alignItems: "center" },
  progressBar: { height: 8, borderRadius: 4, marginTop: 8 },
  actionBar: { padding: 16, paddingBottom: 0 },
  waitingBanner: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 8 },
  listContent: { padding: 16, paddingBottom: 120 },
  stopCard: { borderRadius: 12, borderLeftWidth: 4 },
  stopHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  seqBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#14395E",
    justifyContent: "center",
    alignItems: "center",
  },
  seqText: { color: "#FFF", fontWeight: "bold", fontSize: 13 },
  stopInfo: { flex: 1 },
  stopFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  closeBar: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  mapOption: { justifyContent: "flex-start", marginVertical: 2 },
});
