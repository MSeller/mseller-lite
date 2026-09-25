import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
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
import type { CustomTheme, StatusTokens } from "@/constants/Theme";
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

// A rescheduled stop ("accent") is neither a problem nor done; a delivery with a note ("info")
// is done but must not read as a clean delivery.
type DetalleTone = keyof StatusTokens;

const detalleStatus: Record<RutaDetalleStatus, { tone: DetalleTone; key: string; icon: string }> = {
  activo: { tone: "warning", key: "entrega.detalle.pending", icon: "clock-outline" },
  entregado: { tone: "positive", key: "entrega.detalle.entregado", icon: "check-circle" },
  entregado_con_novedad: { tone: "info", key: "entrega.detalle.entregado_con_novedad", icon: "check-decagram" },
  parcial: { tone: "warning", key: "entrega.detalle.parcial", icon: "alert-circle-outline" },
  entregar_despues: { tone: "accent", key: "entrega.detalle.entregar_despues", icon: "calendar-clock" },
  no_entregado: { tone: "negative", key: "entrega.detalle.no_entregado", icon: "close-circle-outline" },
  excluido: { tone: "neutral", key: "entrega.detalle.excluido", icon: "minus-circle-outline" },
  reasignado: { tone: "neutral", key: "entrega.detalle.reasignado", icon: "swap-horizontal" },
};

export default function RutaEntregaDetalleScreen() {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
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
    const tone = theme.custom.status[st.tone];
    const canNavigate = hasCoords(item);
    return (
      <Card elevation={0}
        style={[styles.stopCard, { backgroundColor: theme.colors.surface, borderLeftColor: tone.base }]}
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
            <Chip compact style={{ backgroundColor: tone.container }} textStyle={{ color: tone.onContainer, fontSize: theme.custom.type.caption.fontSize }} icon={st.icon}>
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
      <View style={styles.summary}>
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
          color={progress >= 1 ? theme.custom.status.positive.base : theme.colors.primary}
          style={styles.progressBar}
        />
      </View>

      {isLoadPhase && (
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
        <View style={styles.closeBar}>
          <Button
            mode="contained"
            icon="flag-checkered"
            buttonColor={theme.custom.status.positive.base}
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

const PROGRESS_BAR_HEIGHT = 8;
const SEQ_BADGE_SIZE = 30;

const createStyles = (theme: CustomTheme) => {
  const { colors, radius, type, surface, hairline } = theme.custom;
  return StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
    summary: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.surfaceCard,
      borderBottomWidth: hairline,
      borderBottomColor: colors.hairline,
    },
    summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    vehRow: { flexDirection: "row", alignItems: "center" },
    progressBar: { height: PROGRESS_BAR_HEIGHT, borderRadius: PROGRESS_BAR_HEIGHT / 2, marginTop: 8 },
    actionBar: { padding: 16, paddingBottom: 0 },
    listContent: { padding: 16, paddingBottom: 120 },
    stopCard: { borderRadius: radius.container, borderLeftWidth: 4 },
    stopHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
    // Sequence numbers are data, not actions: an ink disc with page-coloured digits.
    seqBadge: {
      width: SEQ_BADGE_SIZE,
      height: SEQ_BADGE_SIZE,
      borderRadius: SEQ_BADGE_SIZE / 2,
      backgroundColor: colors.ink,
      justifyContent: "center",
      alignItems: "center",
    },
    seqText: { ...type.figure(type.caption.fontSize ?? 13), color: colors.background },
    stopInfo: { flex: 1 },
    stopFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
    closeBar: { ...surface.floating, padding: 16 },
    mapOption: { justifyContent: "flex-start", marginVertical: 2 },
  });
};
