import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Dialog,
  Icon,
  IconButton,
  Portal,
  Snackbar,
  Text,
  useTheme,
} from "react-native-paper";
import { gutterFor, type CustomTheme } from "@/constants/Theme";
import { useTranslation } from "@/hooks/useTranslation";
import { EntregaHeader } from "../../../components/entrega/EntregaHeader";
import EmptyState from "../../../components/ui/EmptyState";
import GradientButton from "../../../components/ui/GradientButton";
import { PendientesFacturarBanner } from "../../../components/entrega/PendientesFacturarBanner";
import { detalleStatusOf } from "../../../components/entrega/detalleStatus";
import RouteStatusChip from "../../../components/routes/RouteStatusChip";
import BrandGradient from "../../../components/ui/BrandGradient";
import StatusChip from "../../../components/ui/StatusChip";
import { entregaService } from "../../../services/entregaService";
import { EntregaFacturaResumen, EntregaRutaDetalle } from "../../../types/entrega";
import { formatMoney } from "../../../utils/documentFormat";
import {
  MapDestination,
  hasCoords,
  mapProviderOptions,
  openInMaps,
  vehiculoLabel,
} from "../../../utils/mapLinks";
import AppButton from "../../../components/ui/AppButton";

export default function RutaEntregaDetalleScreen() {
  const theme = useTheme() as CustomTheme;
  const { width } = useWindowDimensions();
  const gutter = gutterFor(width);
  const styles = useMemo(() => createStyles(theme, gutter), [theme, gutter]);
  const { colors } = theme.custom;
  // Android draws edge to edge: the system navigation bar overlaps the bottom of the screen.
  const insets = useSafeAreaInsets();
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

  // The route detail is the root of the nested route stack, so popping that stack does nothing.
  // Pop the root history instead (back to the routes list), falling back to the list explicitly.
  const backToList = () => {
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: "/(tabs)/routes", params: { section: "deliveries" } });
  };

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
  // Stops waiting for an invoice are not listed but still have to be delivered before closing.
  const pendientesFacturar = data?.pendientesFacturar ?? 0;
  const hasPending = facturas.some((f) => f.statusDetalle === "activo") || pendientesFacturar > 0;
  // Stops waiting for an invoice are still outstanding: they count toward the total so the bar
  // never reads complete while the route cannot be closed.
  const outstanding = facturas.filter((f) => f.statusDetalle === "activo").length + pendientesFacturar;
  const denominator = total + pendientesFacturar;
  const progress = denominator > 0 ? (denominator - outstanding) / denominator : 0;
  const invoicesTotal = facturas.reduce((sum, f) => sum + (f.total ?? 0), 0);

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
    const st = detalleStatusOf(item.statusDetalle);
    const canNavigate = hasCoords(item);
    const customer = item.nombreCliente || item.codigoCliente;
    const docNo = item.noFactura || item.noPedidoStr;
    const amount = formatMoney(item.total);
    return (
      <View style={styles.row}>
        <Pressable
          style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}
          onPress={() =>
            router.push(
              `/entrega/${numericRutaId}/factura/${encodeURIComponent(item.noPedidoStr)}` as any
            )
          }
          accessibilityRole="button"
          accessibilityLabel={t("entrega.ui.stopA11y", {
            seq: item.secuenciaEntrega,
            customer,
            address: item.direccion ?? "",
            status: t(st.key),
            doc: docNo,
            amount,
          })}
        >
          <View style={styles.seqBadge}>
            <Text style={styles.seqText}>{item.secuenciaEntrega}</Text>
          </View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {customer}
            </Text>
            {!!item.direccion && (
              <Text style={styles.rowAddress} numberOfLines={2}>
                {item.direccion}
              </Text>
            )}
            <StatusChip label={t(st.key)} tone={st.tone} />
          </View>
          <View style={styles.rowValues}>
            <Text style={styles.rowDoc} numberOfLines={1}>
              {docNo}
            </Text>
            <Text style={styles.rowAmount} numberOfLines={1} adjustsFontSizeToFit>
              {amount}
            </Text>
          </View>
          <Icon source="chevron-right" size={24} color={colors.tint} />
        </Pressable>
        <IconButton
          icon="map-marker-outline"
          size={22}
          iconColor={colors.tint}
          disabled={!canNavigate}
          style={styles.mapButton}
          accessibilityLabel={t("entrega.ui.openMapFor", { customer })}
          onPress={() =>
            setMapTarget({ latitud: item.latitud, longitud: item.longitud, label: item.nombreCliente })
          }
        />
      </View>
    );
  };

  const title = data?.noRuta || t("entrega.routeDetailTitle");

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <EntregaHeader title={title} onBack={backToList} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <EntregaHeader title={title} onBack={backToList} />
        <EmptyState
            style={styles.stateView}
          icon="cloud-off-outline"
          title={t("entrega.ui.errorTitle")}
          message={error || t("entrega.errorLoading")}
          action={{ label: t("common.retry"), onPress: () => { setLoading(true); load(); } }}
        />
      </SafeAreaView>
    );
  }

  const veh = [vehiculoLabel(data.vehiculoTipo), data.vehiculoPlaca].filter(Boolean).join(" · ");
  const showFooter = isLoadPhase || isEnRuta;

  const listHeader = (
    <View>
      <View style={styles.hero}>
        <View style={styles.heroMeta}>
          <RouteStatusChip status={data.status} />
          {!!veh && (
            <View style={styles.vehRow}>
              <Icon source="truck-outline" size={18} color={colors.inkSecondary} />
              <Text style={styles.vehText} numberOfLines={1}>
                {veh}
              </Text>
            </View>
          )}
        </View>

        <BrandGradient raised>
          <View
            style={styles.summaryTop}
            accessible
            accessibilityLabel={t("entrega.ui.summaryA11y", { done, total, amount: formatMoney(invoicesTotal) })}
          >
            <Text style={styles.summaryOverline}>{t("entrega.ui.deliveredOverline")}</Text>
            <Text style={styles.summaryFigure} numberOfLines={1} adjustsFontSizeToFit>
              {done}
              <Text style={styles.summaryFigureMuted}>/{total}</Text>
            </Text>
            <View style={styles.track}>
              <View style={[styles.trackFill, { width: `${Math.round(progress * 100)}%` as const }]} />
            </View>
          </View>
          <View style={styles.summaryBottom} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            <Text style={styles.summaryOverline}>{t("entrega.ui.invoicesTotal")}</Text>
            <Text style={styles.summaryAmount} numberOfLines={1} adjustsFontSizeToFit>
              {formatMoney(invoicesTotal)}
            </Text>
          </View>
        </BrandGradient>
      </View>

      <PendientesFacturarBanner count={pendientesFacturar} />

      <View style={styles.sectionHeader}>
        <Text style={styles.overline}>{t("entrega.ui.stopsOverline", { count: total })}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <EntregaHeader title={title} onBack={backToList} />

      <FlatList
        data={facturas}
        keyExtractor={(item) => String(item.rutaDetalleId)}
        renderItem={renderStop}
        ListHeaderComponent={listHeader}
        contentContainerStyle={[styles.listContent, !showFooter && { paddingBottom: theme.custom.spacing.xxl + insets.bottom }]}
        ListEmptyComponent={
          <EmptyState
            style={styles.stateView}
            icon="map-marker-path"
            title={t("entrega.noStops")}
            message={t("entrega.ui.noStopsBody")}
            action={{ label: t("common.refresh"), onPress: load }}
          />
        }
      />

      {showFooter && (
        <View style={[styles.footer, { paddingBottom: theme.custom.spacing.md + insets.bottom }]}>
          {isLoadPhase ? (
            <GradientButton
              icon="truck-fast-outline"
              label={t("entrega.loadTruck")}
              onPress={() => router.push(`/entrega/${numericRutaId}/carga` as any)}
            />
          ) : (
            <>
              {hasPending && (
                <Text style={styles.footerHint}>
                  {pendientesFacturar > 0 ? t("entrega.pendingInvoicesHint") : t("entrega.pendingStopsHint")}
                </Text>
              )}
              <GradientButton
                icon="flag-checkered"
                label={t("entrega.closeTransport")}
                disabled={hasPending || total === 0}
                loading={closing}
                onPress={handleClose}
              />
            </>
          )}
        </View>
      )}

      <Portal>
        <Dialog visible={!!mapTarget} onDismiss={() => setMapTarget(null)}>
          <Dialog.Title>{t("entrega.openIn")}</Dialog.Title>
          <Dialog.Content>
            {mapProviderOptions().map((opt) => (
              <AppButton
                key={opt.provider}
                icon={opt.icon}
                mode="text"
                style={styles.mapOption}
                contentStyle={styles.mapOptionContent}
                onPress={async () => {
                  const target = mapTarget;
                  setMapTarget(null);
                  if (target) await openInMaps(opt.provider, target);
                }}
              >
                {opt.label}
              </AppButton>
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

const SEQ_BADGE_SIZE = 28;
const TRACK_HEIGHT = 6;

const createStyles = (theme: CustomTheme, gutter: number) => {
  const { colors, spacing, type, surface, hairline, touchTarget } = theme.custom;
  return StyleSheet.create({
    // Fills the screen and centres the empty or error state in it.
    stateView: { flex: 1 },
    container: { flex: 1, backgroundColor: colors.background },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
    pressed: { backgroundColor: colors.fill },
    hero: { paddingHorizontal: gutter, paddingTop: spacing.sm, paddingBottom: spacing.lg, gap: spacing.md },
    heroMeta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.md },
    vehRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, flexShrink: 1 },
    vehText: { ...type.bodySmall, flexShrink: 1 },
    summaryTop: { padding: spacing.xl, gap: spacing.sm },
    summaryOverline: { ...type.overline, color: colors.onGradientSecondary },
    summaryFigure: { ...type.figure(34), color: colors.onGradient },
    summaryFigureMuted: { ...type.figure(22), color: colors.onGradientSecondary },
    // The progress track on the gradient: a divider-tone rail with a white fill. The radius is
    // half the rail's own height (geometry, not a token).
    track: {
      height: TRACK_HEIGHT,
      borderRadius: TRACK_HEIGHT / 2,
      backgroundColor: colors.onGradientDivider,
      overflow: "hidden",
      marginTop: spacing.xs,
    },
    trackFill: { height: TRACK_HEIGHT, backgroundColor: colors.onGradient },
    summaryBottom: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      borderTopWidth: hairline,
      borderTopColor: colors.onGradientDivider,
    },
    summaryAmount: { ...type.figure(20), color: colors.onGradient, flexShrink: 1 },
    sectionHeader: {
      paddingHorizontal: gutter,
      paddingTop: spacing.xl,
      paddingBottom: spacing.sm,
      borderBottomWidth: hairline,
      borderBottomColor: colors.hairline,
    },
    overline: { ...type.overline },
    listContent: { flexGrow: 1, paddingBottom: spacing.xxl },
    row: {
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: hairline,
      borderBottomColor: colors.hairline,
      paddingRight: gutter - spacing.sm,
    },
    rowMain: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingLeft: gutter,
      paddingVertical: spacing.md,
      minHeight: touchTarget,
    },
    // Sequence numbers are data, not actions: an ink disc with page-coloured digits.
    seqBadge: {
      width: SEQ_BADGE_SIZE,
      height: SEQ_BADGE_SIZE,
      borderRadius: SEQ_BADGE_SIZE / 2,
      backgroundColor: colors.ink,
      justifyContent: "center",
      alignItems: "center",
      alignSelf: "flex-start",
    },
    seqText: { ...type.figure(type.caption.fontSize ?? 13), color: colors.background },
    rowInfo: { flex: 1, gap: spacing.xs },
    rowTitle: { ...type.rowTitle },
    rowAddress: { ...type.bodySmall, color: colors.inkSecondary },
    rowValues: { alignItems: "flex-end", gap: spacing.xs, maxWidth: "38%" },
    rowDoc: { ...type.caption },
    rowAmount: { ...type.figure(17) },
    mapButton: { margin: 0 },
    footer: { ...surface.floating, paddingHorizontal: gutter, paddingTop: spacing.md, gap: spacing.sm },
    footerHint: { ...type.caption, textAlign: "center" },
    mapOption: { justifyContent: "flex-start", marginVertical: 2 },
    mapOptionContent: { justifyContent: "flex-start" },
  });
};
