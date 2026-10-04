import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, useWindowDimensions, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Dialog,
  Icon,
  Portal,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

import { gutterFor, type CustomTheme } from "@/constants/Theme";
import { useTranslation } from "@/hooks/useTranslation";
import { entregaService } from "../../../services/entregaService";
import { CargaCliente, CargaResponse, ItemCargaFaltante } from "../../../types/preparacion";
import { EntregaHeader } from "../../../components/entrega/EntregaHeader";
import { useBackToRoute } from "../../../components/entrega/useBackToRoute";
import EmptyState from "../../../components/ui/EmptyState";
import GradientButton from "../../../components/ui/GradientButton";
import { PendientesFacturarBanner } from "../../../components/entrega/PendientesFacturarBanner";
import BrandGradient from "../../../components/ui/BrandGradient";
import StatusChip from "../../../components/ui/StatusChip";
import { puedeSalirARuta } from "../../../utils/entregaAttempts";
import { vehiculoLabel } from "../../../utils/mapLinks";
import AppButton from "../../../components/ui/AppButton";

export default function CargaScreen() {
  const theme = useTheme() as CustomTheme;
  const { width } = useWindowDimensions();
  const gutter = gutterFor(width);
  const styles = useMemo(() => createStyles(theme, gutter), [theme, gutter]);
  const { status, colors } = theme.custom;
  // Android draws edge to edge: the system navigation bar overlaps the bottom of the screen.
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { rutaId } = useLocalSearchParams<{ rutaId: string }>();
  const backToRoute = useBackToRoute(rutaId);
  const numericRutaId = parseInt(rutaId ?? "0", 10);

  const [data, setData] = useState<CargaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<number, Set<string>>>({});
  const [declineTarget, setDeclineTarget] = useState<CargaCliente | null>(null);
  const [declineNote, setDeclineNote] = useState("");
  const [issueTarget, setIssueTarget] = useState<CargaCliente | null>(null);
  const [issueNote, setIssueNote] = useState("");
  const [declined, setDeclined] = useState<Record<number, string>>({});
  // Cards declined this session: the server drops them from the load list (excluido), but the driver
  // keeps seeing them marked "Rechazado" with the reason until leaving the screen.
  const [declinedCards, setDeclinedCards] = useState<Record<number, CargaCliente>>({});
  const [dispatching, setDispatching] = useState(false);

  const loadCarga = useCallback(async () => {
    try {
      setError("");
      const response = await entregaService.getCarga(numericRutaId);
      setData(response);
      // Refreshes keep the items the driver already ticked; new stops start empty.
      setCheckedItems((prev) => {
        const checks: Record<number, Set<string>> = {};
        for (const c of response.clientes ?? []) checks[c.rutaDetalleId] = prev[c.rutaDetalleId] ?? new Set();
        return checks;
      });
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || t("entrega.errorLoadingCarga"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [numericRutaId, t]);

  // Reload whenever the screen regains focus (e.g. back from another screen).
  useFocusEffect(
    useCallback(() => {
      loadCarga();
    }, [loadCarga])
  );

  // While stops wait for an invoice, the office may invoice them at any moment: poll so the new stops
  // and "Salir a ruta" appear without the driver having to pull to refresh.
  const pendientesFacturar = data?.pendientesFacturar ?? 0;
  useEffect(() => {
    if (pendientesFacturar === 0) return;
    const id = setInterval(loadCarga, PENDING_INVOICE_POLL_MS);
    return () => clearInterval(id);
  }, [pendientesFacturar, loadCarga]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadCarga();
  }, [loadCarga]);

  const toggleItem = (id: number, code: string) =>
    setCheckedItems((prev) => {
      const cur = new Set(prev[id] ?? []);
      if (cur.has(code)) cur.delete(code);
      else cur.add(code);
      return { ...prev, [id]: cur };
    });

  const checkedCount = (item: CargaCliente) => checkedItems[item.rutaDetalleId]?.size ?? 0;
  const allChecked = (item: CargaCliente) =>
    (item.productos ?? []).length > 0 &&
    (item.productos ?? []).every((p) => checkedItems[item.rutaDetalleId]?.has(p.codigoProducto));

  const markConfirmed = (id: number, conIncidencia: boolean, observacion?: string) =>
    setData((prev) =>
      prev
        ? { ...prev, clientes: prev.clientes.map((c) => (c.rutaDetalleId === id ? { ...c, confirmado: true, conIncidencia, cargaObservacion: observacion ?? c.cargaObservacion } : c)) }
        : prev
    );

  const handleConfirm = async (item: CargaCliente, faltantes?: ItemCargaFaltante[], observacion?: string) => {
    try {
      setBusy(item.rutaDetalleId);
      setError("");
      const hasIssue = !!(faltantes && faltantes.length);
      const body = hasIssue || observacion ? { itemsFaltantes: faltantes, observacion } : undefined;
      const response = await entregaService.confirmarCarga(numericRutaId, item.rutaDetalleId, body);
      markConfirmed(item.rutaDetalleId, hasIssue, observacion);
      setExpandedId(null);
      if (response.rutaDespachada) {
        setSuccess(t("entrega.routeDispatched"));
        // Route is now en_ruta — land on the route detail, which lists the loaded orders as the
        // delivery worklist (reloads via useFocusEffect).
        router.replace(`/entrega/${numericRutaId}`);
      } else {
        setSuccess(hasIssue ? t("entrega.loadedWithIssue") : t("entrega.clientLoaded"));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t("entrega.errorConfirmingLoad"));
    } finally {
      setBusy(null);
    }
  };

  const submitIssue = () => {
    const item = issueTarget;
    if (!item) return;
    const checked = checkedItems[item.rutaDetalleId] ?? new Set<string>();
    const faltantes: ItemCargaFaltante[] = (item.productos ?? [])
      .filter((p) => !checked.has(p.codigoProducto))
      .map((p) => ({ codigoProducto: p.codigoProducto, cantidadFaltante: p.cantidad }));
    setIssueTarget(null);
    handleConfirm(item, faltantes, issueNote || undefined);
  };

  const handleDecline = async () => {
    const item = declineTarget;
    if (!item) return;
    try {
      setBusy(item.rutaDetalleId);
      setError("");
      const note = declineNote;
      setDeclineTarget(null);
      await entregaService.rechazarCarga(numericRutaId, item.rutaDetalleId, note || undefined);
      // Keep the card visible, marked "Rechazado" with the reason (feedback), instead of removing it.
      setDeclined((prev) => ({ ...prev, [item.rutaDetalleId]: note }));
      setDeclinedCards((prev) => ({ ...prev, [item.rutaDetalleId]: item }));
      setExpandedId(null);
      setDeclineNote("");
      setSuccess(t("entrega.invoiceDeclined"));
    } catch (err: any) {
      setError(err.response?.data?.message || t("entrega.errorDeclining"));
    } finally {
      setBusy(null);
    }
  };

  const serverIds = new Set((data?.clientes ?? []).map((c) => c.rutaDetalleId));
  const sorted = [
    ...(data?.clientes ?? []),
    ...Object.values(declinedCards).filter((c) => !serverIds.has(c.rutaDetalleId)),
  ].sort((a, b) => b.secuenciaEntrega - a.secuenciaEntrega);
  const activeCards = sorted.filter((c) => !declined[c.rutaDetalleId]);
  const totalC = activeCards.length;
  const loadedC = activeCards.filter((c) => c.confirmado).length;
  const allLoaded = puedeSalirARuta({ total: totalC, cargados: loadedC });
  const canLeave = puedeSalirARuta({ total: totalC, cargados: loadedC, pendientesFacturar });

  // Leave on the route: the server moves it to en_ruta when every stop is invoiced and loaded (or
  // declined) and answers 409 with the stops still blocking — shown as is. Also recovers a fully
  // loaded route that didn't auto-transition.
  const handleDispatch = async () => {
    try {
      setDispatching(true);
      setError("");
      await entregaService.despacharRuta(numericRutaId);
      setSuccess(t("entrega.routeDispatched"));
      // Route is now en_ruta — land on the route detail, which lists the loaded orders as the
      // delivery worklist (reloads via useFocusEffect).
      router.replace(`/entrega/${numericRutaId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || t("entrega.errorDispatching"));
    } finally {
      setDispatching(false);
    }
  };
  const veh = data ? [vehiculoLabel(data.vehiculoTipo as any), data.vehiculoPlaca].filter(Boolean).join(" · ") : "";

  const renderCard = ({ item }: { item: CargaCliente }) => {
    const isBusy = busy === item.rutaDetalleId;
    const isExpanded = expandedId === item.rutaDetalleId;
    const productos = item.productos ?? [];
    const checked = checkedCount(item);
    const complete = allChecked(item);

    const isDeclined = !!declined[item.rutaDetalleId];
    const reason = isDeclined ? declined[item.rutaDetalleId] : item.conIncidencia ? item.cargaObservacion : undefined;
    const locked = item.confirmado || isDeclined;

    const toneKey = isDeclined ? "negative" : item.confirmado && !item.conIncidencia ? "positive" : "warning";
    const tone = status[toneKey];
    const pillText = isDeclined
      ? t("entrega.declined")
      : item.confirmado
        ? item.conIncidencia
          ? t("entrega.loadedWithIssueShort")
          : t("entrega.loaded")
        : t("entrega.pending");

    return (
      <View style={[styles.stop, isExpanded && styles.stopExpanded]}>
        <Pressable
          onPress={() => !locked && setExpandedId((p) => (p === item.rutaDetalleId ? null : item.rutaDetalleId))}
          disabled={locked}
          style={({ pressed }) => [styles.stopRow, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityState={{ expanded: isExpanded, disabled: locked }}
          accessibilityLabel={[
            t("entrega.ui.loadStopA11y", {
              seq: item.secuenciaEntrega,
              customer: item.nombreCliente,
              invoice: item.noFactura,
              count: productos.length,
              status: pillText,
            }),
            reason,
          ]
            .filter(Boolean)
            .join(", ")}
        >
          <View style={[styles.stateWell, { backgroundColor: tone.container }]}>
            {isDeclined ? (
              <Icon source="close" size={18} color={tone.onContainer} />
            ) : item.confirmado ? (
              <Icon source="check" size={18} color={tone.onContainer} />
            ) : (
              <Text style={[styles.seqText, { color: tone.onContainer }]}>{item.secuenciaEntrega}</Text>
            )}
          </View>
          <View style={styles.stopInfo}>
            <Text style={styles.stopTitle} numberOfLines={1}>
              {item.nombreCliente}
            </Text>
            <Text style={styles.stopMeta} numberOfLines={1}>
              {[item.noFactura, item.codigoCliente, t("entrega.ui.itemsCount", { count: productos.length })].join(" · ")}
            </Text>
            {!!item.direccion && (
              <Text style={styles.stopAddress} numberOfLines={2}>
                {item.direccion}
              </Text>
            )}
            {!!reason && (
              <View style={[styles.reasonBox, { backgroundColor: tone.container }]}>
                <Icon source={isDeclined ? "close-circle-outline" : "alert-circle-outline"} size={16} color={tone.onContainer} />
                <Text style={[styles.reasonText, { color: tone.onContainer }]}>{reason}</Text>
              </View>
            )}
          </View>
          <View style={styles.stopTrailing}>
            <StatusChip label={pillText} tone={toneKey} />
            {!locked && <Icon source={isExpanded ? "chevron-up" : "chevron-down"} size={24} color={colors.tint} />}
          </View>
        </Pressable>

        {isExpanded && !locked && (
          <View style={styles.expanded}>
            <Text style={styles.expandedOverline}>
              {t("entrega.invoiceDetailsLabel")} · {checked}/{productos.length}
            </Text>
            {productos.map((prod, idx) => {
              const isChecked = checkedItems[item.rutaDetalleId]?.has(prod.codigoProducto) ?? false;
              const name = prod.descripcion || prod.codigoProducto;
              return (
                <Pressable
                  key={`${prod.codigoProducto}-${idx}`}
                  onPress={() => toggleItem(item.rutaDetalleId, prod.codigoProducto)}
                  style={({ pressed }) => [styles.itemRow, pressed && styles.pressed]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isChecked }}
                  accessibilityLabel={t("entrega.ui.loadItemA11y", {
                    name,
                    qty: prod.cantidad,
                    unit: prod.unidad ?? "",
                  })}
                >
                  <Icon
                    source={isChecked ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
                    size={26}
                    color={isChecked ? status.positive.base : colors.tint}
                  />
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemName, isChecked && styles.itemNameChecked]} numberOfLines={2}>
                      {name}
                    </Text>
                    <Text style={styles.itemCode} numberOfLines={1}>{prod.codigoProducto}</Text>
                  </View>
                  <View style={styles.qtyBox}>
                    <Text style={styles.qtyNum}>{prod.cantidad}</Text>
                    {!!prod.unidad && <Text style={styles.qtyUnit} numberOfLines={1}>{prod.unidad}</Text>}
                  </View>
                </Pressable>
              );
            })}

            {!complete && (
              <View style={styles.quickActions}>
                <Pressable
                  onPress={() => { setIssueNote(""); setIssueTarget(item); }}
                  disabled={isBusy}
                  style={styles.quickAction}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isBusy, busy: isBusy }}
                >
                  {isBusy ? (
                    <ActivityIndicator size="small" color={status.warning.base} />
                  ) : (
                    <Icon source="alert-circle-outline" size={20} color={status.warning.base} />
                  )}
                  <Text style={[styles.quickActionLabel, { color: status.warning.base }]}>{t("entrega.confirmWithIssue")}</Text>
                </Pressable>
                <Pressable
                  onPress={() => { setDeclineNote(""); setDeclineTarget(item); }}
                  disabled={isBusy}
                  style={styles.quickAction}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isBusy }}
                >
                  <Icon source="close-circle-outline" size={20} color={status.negative.base} />
                  <Text style={[styles.quickActionLabel, { color: status.negative.base }]}>{t("entrega.declineInvoice")}</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <EntregaHeader title={t("entrega.loadTruck")} onBack={backToRoute} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <EntregaHeader title={t("entrega.loadTruck")} onBack={backToRoute} />
        <EmptyState
            style={styles.stateView}
          icon="cloud-off-outline"
          title={t("entrega.ui.errorTitle")}
          message={error || t("entrega.errorLoadingCarga")}
          action={{ label: t("common.retry"), onPress: () => { setLoading(true); loadCarga(); } }}
        />
      </SafeAreaView>
    );
  }

  // The footer carries the one primary action in reach: confirming the stop being checked, or,
  // once every stop is loaded, leaving on the route.
  const expandedItem = sorted.find(
    (c) => c.rutaDetalleId === expandedId && !c.confirmado && !declined[c.rutaDetalleId]
  );
  const expandedComplete = expandedItem ? allChecked(expandedItem) : false;
  const expandedBusy = !!expandedItem && busy === expandedItem.rutaDetalleId;
  const expandedMissing = expandedItem ? (expandedItem.productos ?? []).length - checkedCount(expandedItem) : 0;
  const showFooter = !!expandedItem || canLeave;

  const listHeader = (
    <View>
      <View style={styles.hero}>
        <View style={styles.heroMeta}>
          {!!data.noRuta && <Text style={styles.heroOverline}>{data.noRuta}</Text>}
          {!!veh && (
            <View style={styles.vehRow}>
              <Icon source="truck-outline" size={18} color={colors.inkSecondary} />
              <Text style={styles.vehText} numberOfLines={1}>{veh}</Text>
            </View>
          )}
        </View>
        <BrandGradient raised>
          <View
            style={styles.summary}
            accessible
            accessibilityLabel={`${t("entrega.loadingProgressLabel")}: ${t("entrega.clientsShort", { loaded: loadedC, total: totalC })}`}
          >
            <Text style={styles.summaryOverline}>{t("entrega.loadingProgressLabel")}</Text>
            <Text style={styles.summaryFigure} numberOfLines={1} adjustsFontSizeToFit>
              {loadedC}
              <Text style={styles.summaryFigureMuted}>/{totalC}</Text>
            </Text>
            <Text style={styles.summaryCaption}>
              {allLoaded ? t("entrega.allLoaded") : t("entrega.clientsShort", { loaded: loadedC, total: totalC })}
            </Text>
            <View style={styles.track}>
              <View style={[styles.trackFill, { width: `${totalC > 0 ? Math.round((loadedC / totalC) * 100) : 0}%` as const }]} />
            </View>
          </View>
        </BrandGradient>
      </View>

      <PendientesFacturarBanner count={pendientesFacturar} />

      <View style={styles.sectionHeader}>
        <Text style={styles.overline}>{t("entrega.ui.clientsOverline", { count: sorted.length })}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <EntregaHeader title={t("entrega.loadTruck")} onBack={backToRoute} />

      <FlatList
        data={sorted}
        keyExtractor={(item) => String(item.rutaDetalleId)}
        renderItem={renderCard}
        ListHeaderComponent={listHeader}
        contentContainerStyle={[styles.listContent, !showFooter && { paddingBottom: theme.custom.spacing.xxl + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.tint} />}
        ListEmptyComponent={
          <EmptyState
            style={styles.stateView}
            icon="truck-outline"
            title={t("entrega.ui.noLoadStops")}
            message={t("entrega.ui.noLoadStopsBody")}
            action={{ label: t("common.refresh"), onPress: handleRefresh }}
          />
        }
      />

      {showFooter && (
        <View style={[styles.footer, { paddingBottom: theme.custom.spacing.md + insets.bottom }]}>
          {expandedItem ? (
            <>
              {!expandedComplete && (
                <Text style={styles.footerHint}>{t("entrega.itemsMissing", { count: expandedMissing })}</Text>
              )}
              <GradientButton
                icon="truck-check-outline"
                label={t("entrega.confirmLoad")}
                disabled={!expandedComplete || expandedBusy}
                loading={expandedBusy && expandedComplete}
                onPress={() => handleConfirm(expandedItem)}
              />
            </>
          ) : (
            <GradientButton
              icon="truck-fast-outline"
              label={t("entrega.leaveOnRoute")}
              loading={dispatching}
              onPress={handleDispatch}
            />
          )}
        </View>
      )}

      <Portal>
        <Dialog visible={!!issueTarget} onDismiss={() => setIssueTarget(null)}>
          <Dialog.Title>{t("entrega.confirmWithIssue")}</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogHint}>{t("entrega.issueHint")}</Text>
            <TextInput mode="outlined" value={issueNote} onChangeText={setIssueNote} placeholder={t("entrega.issuePlaceholder")} multiline numberOfLines={2} />
          </Dialog.Content>
          <Dialog.Actions>
            <AppButton onPress={() => setIssueTarget(null)}>{t("common.cancel")}</AppButton>
            <AppButton textColor={status.warning.base} onPress={submitIssue}>{t("entrega.confirmWithIssue")}</AppButton>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={!!declineTarget} onDismiss={() => setDeclineTarget(null)}>
          <Dialog.Title>{t("entrega.declineInvoice")}</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogHint}>{t("entrega.declineHint")}</Text>
            <TextInput mode="outlined" value={declineNote} onChangeText={setDeclineNote} placeholder={t("entrega.reasonPlaceholder")} multiline numberOfLines={2} />
          </Dialog.Content>
          <Dialog.Actions>
            <AppButton onPress={() => setDeclineTarget(null)}>{t("common.cancel")}</AppButton>
            <AppButton textColor={status.negative.base} onPress={handleDecline}>{t("entrega.declineInvoice")}</AppButton>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={!!error} onDismiss={() => setError("")} duration={4000} action={{ label: t("common.retry"), onPress: () => { setError(""); loadCarga(); } }}>{error}</Snackbar>
      <Snackbar visible={!!success} onDismiss={() => setSuccess("")} duration={2000}>{success}</Snackbar>
    </SafeAreaView>
  );
}

const PENDING_INVOICE_POLL_MS = 30_000;
const STATE_WELL_SIZE = 36;
const TRACK_HEIGHT = 6;

const createStyles = (theme: CustomTheme, gutter: number) => {
  const { colors, radius, spacing, type, surface, hairline, touchTarget } = theme.custom;
  return StyleSheet.create({
    // Fills the screen and centres the empty or error state in it.
    stateView: { flex: 1 },
    container: { flex: 1, backgroundColor: colors.background },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
    pressed: { backgroundColor: colors.fill },
    hero: { paddingHorizontal: gutter, paddingTop: spacing.sm, paddingBottom: spacing.lg, gap: spacing.md },
    heroMeta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.md },
    heroOverline: { ...type.overline },
    vehRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, flexShrink: 1 },
    vehText: { ...type.bodySmall, flexShrink: 1 },
    summary: { padding: spacing.xl, gap: spacing.sm },
    summaryOverline: { ...type.overline, color: colors.onGradientSecondary },
    summaryFigure: { ...type.figure(34), color: colors.onGradient },
    summaryFigureMuted: { ...type.figure(22), color: colors.onGradientSecondary },
    summaryCaption: { ...type.bodySmall, color: colors.onGradientSecondary },
    // A divider-tone rail with a white fill; the radius is half its own height (geometry).
    track: {
      height: TRACK_HEIGHT,
      borderRadius: TRACK_HEIGHT / 2,
      backgroundColor: colors.onGradientDivider,
      overflow: "hidden",
      marginTop: spacing.xs,
    },
    trackFill: { height: TRACK_HEIGHT, backgroundColor: colors.onGradient },
    sectionHeader: {
      paddingHorizontal: gutter,
      paddingTop: spacing.xl,
      paddingBottom: spacing.sm,
      borderBottomWidth: hairline,
      borderBottomColor: colors.hairline,
    },
    overline: { ...type.overline },
    listContent: { flexGrow: 1, paddingBottom: spacing.xxl },
    stop: { borderBottomWidth: hairline, borderBottomColor: colors.hairline },
    stopExpanded: { backgroundColor: colors.surfaceRaised },
    stopRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.md,
      paddingHorizontal: gutter,
      paddingVertical: spacing.md,
      minHeight: touchTarget,
    },
    // A status-tinted disc: the sequence number until loaded, then the outcome. The radius is
    // half the disc's own size (geometry, not a token).
    stateWell: {
      width: STATE_WELL_SIZE,
      height: STATE_WELL_SIZE,
      borderRadius: STATE_WELL_SIZE / 2,
      justifyContent: "center",
      alignItems: "center",
    },
    seqText: { ...type.figure(type.bodySmall.fontSize ?? 15) },
    stopInfo: { flex: 1, gap: spacing.xs },
    stopTitle: { ...type.rowTitle },
    stopMeta: { ...type.caption },
    stopAddress: { ...type.bodySmall, color: colors.inkSecondary },
    stopTrailing: { alignItems: "flex-end", gap: spacing.sm },
    reasonBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.xs,
      marginTop: spacing.xs,
      padding: spacing.sm,
      borderRadius: radius.tag,
    },
    reasonText: { ...type.caption, flex: 1 },
    expanded: { paddingBottom: spacing.sm },
    expandedOverline: {
      ...type.overline,
      paddingHorizontal: gutter,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
    },
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: gutter,
      paddingVertical: spacing.md,
      minHeight: touchTarget + spacing.md,
      borderTopWidth: hairline,
      borderTopColor: colors.hairline,
    },
    itemInfo: { flex: 1 },
    itemName: { ...type.body },
    itemNameChecked: { color: colors.inkSecondary },
    itemCode: { ...type.caption },
    qtyBox: { minWidth: touchTarget, alignItems: "flex-end", justifyContent: "center" },
    qtyNum: type.figure(22),
    qtyUnit: { ...type.overline },
    quickActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      columnGap: spacing.xl,
      paddingHorizontal: gutter,
      paddingTop: spacing.sm,
      borderTopWidth: hairline,
      borderTopColor: colors.hairline,
    },
    quickAction: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: touchTarget },
    quickActionLabel: { ...type.body },
    footer: { ...surface.floating, paddingHorizontal: gutter, paddingTop: spacing.md, gap: spacing.sm },
    footerHint: { ...type.caption, textAlign: "center", color: colors.warningForeground },
    dialogHint: { ...type.bodySmall, marginBottom: spacing.sm },
  });
};
