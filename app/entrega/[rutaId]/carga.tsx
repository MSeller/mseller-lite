import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Button,
  Card,
  Checkbox,
  Chip,
  Dialog,
  Divider,
  Icon,
  Portal,
  ProgressBar,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

import type { CustomTheme } from "@/constants/Theme";
import { useTranslation } from "@/hooks/useTranslation";
import { entregaService } from "../../../services/entregaService";
import { CargaCliente, CargaResponse, ItemCargaFaltante } from "../../../types/preparacion";
import { vehiculoLabel } from "../../../utils/mapLinks";

export default function CargaScreen() {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { status } = theme.custom;
  const router = useRouter();
  const { t } = useTranslation();
  const { rutaId } = useLocalSearchParams<{ rutaId: string }>();
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
  const [dispatching, setDispatching] = useState(false);

  const loadCarga = useCallback(async () => {
    try {
      setError("");
      const response = await entregaService.getCarga(numericRutaId);
      setData(response);
      const checks: Record<number, Set<string>> = {};
      for (const c of response.clientes ?? []) checks[c.rutaDetalleId] = new Set();
      setCheckedItems(checks);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || t("entrega.errorLoadingCarga"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [numericRutaId, t]);

  useEffect(() => {
    loadCarga();
  }, [loadCarga]);

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
      setExpandedId(null);
      setDeclineNote("");
      setSuccess(t("entrega.invoiceDeclined"));
    } catch (err: any) {
      setError(err.response?.data?.message || t("entrega.errorDeclining"));
    } finally {
      setBusy(null);
    }
  };

  const sorted = [...(data?.clientes ?? [])].sort((a, b) => b.secuenciaEntrega - a.secuenciaEntrega);
  const activeCards = sorted.filter((c) => !declined[c.rutaDetalleId]);
  const totalC = activeCards.length;
  const loadedC = activeCards.filter((c) => c.confirmado).length;
  const allLoaded = totalC > 0 && loadedC === totalC;

  // Dispatch a fully-loaded route that didn't auto-transition (re-confirm is idempotent on the
  // backend and re-evaluates dispatch). Recovers a route left in lista_despacho.
  const handleDispatch = async () => {
    const firstLoaded = activeCards.find((c) => c.confirmado);
    if (!firstLoaded) return;
    try {
      setDispatching(true);
      setError("");
      const response = await entregaService.confirmarCarga(numericRutaId, firstLoaded.rutaDetalleId);
      if (response.rutaDespachada) {
        setSuccess(t("entrega.routeDispatched"));
        // Route is now en_ruta — land on the route detail, which lists the loaded orders as the
        // delivery worklist (reloads via useFocusEffect).
        router.replace(`/entrega/${numericRutaId}`);
      } else {
        setError(t("entrega.errorConfirmingLoad"));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t("entrega.errorConfirmingLoad"));
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
    const missing = productos.length - checked;

    const isDeclined = !!declined[item.rutaDetalleId];
    const reason = isDeclined ? declined[item.rutaDetalleId] : item.conIncidencia ? item.cargaObservacion : undefined;
    const locked = item.confirmado || isDeclined;

    const tone = isDeclined ? status.negative : item.confirmado && !item.conIncidencia ? status.positive : status.warning;
    const pillBg = tone.container;
    const pillFg = tone.onContainer;
    const statusColor = tone.base;
    const pillText = isDeclined
      ? t("entrega.declined")
      : item.confirmado
        ? item.conIncidencia
          ? t("entrega.loadedWithIssueShort")
          : t("entrega.loaded")
        : t("entrega.pending");
    const pillIcon = isDeclined ? "close-circle" : item.confirmado ? "check" : "clock-outline";

    return (
      <Card elevation={0}
        style={[
          styles.card,
          { backgroundColor: theme.colors.surface, borderLeftColor: statusColor, opacity: locked ? 0.8 : 1 },
        ]}
      >
        <Pressable onPress={() => !locked && setExpandedId((p) => (p === item.rutaDetalleId ? null : item.rutaDetalleId))}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.header}>
              <View style={[styles.seqBadge, { backgroundColor: statusColor }]}>
                {isDeclined ? <Icon source="close" size={18} color={theme.custom.colors.background} /> : item.confirmado ? <Icon source="check" size={18} color={theme.custom.colors.background} /> : <Text style={styles.seqText}>{item.secuenciaEntrega}</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={{ fontWeight: "bold", color: theme.colors.onSurface }} numberOfLines={1}>
                  {item.nombreCliente}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>{item.codigoCliente}</Text>
                {!!item.direccion && (
                  <View style={styles.addrRow}>
                    <Icon source="map-marker" size={14} color={theme.colors.onSurfaceVariant} />
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 3, flex: 1 }} numberOfLines={2}>
                      {item.direccion}
                    </Text>
                  </View>
                )}
              </View>
              <Chip compact icon={pillIcon} style={{ backgroundColor: pillBg }} textStyle={{ color: pillFg, fontSize: theme.custom.type.caption.fontSize, fontWeight: "700" }}>
                {pillText}
              </Chip>
            </View>
            <View style={styles.metaRow}>
              <Icon source="file-document-outline" size={18} color={theme.colors.primary} />
              <Text style={styles.invoiceText} numberOfLines={1}>{item.noFactura}</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 8, flex: 1 }} numberOfLines={1}>· {productos.length} {t("entrega.items")}</Text>
              {!locked && <Icon source={isExpanded ? "chevron-up" : "chevron-down"} size={22} color={theme.colors.onSurfaceVariant} />}
            </View>
            {!!reason && (
              <View style={[styles.reasonBox, { backgroundColor: tone.container }]}>
                <Icon source={isDeclined ? "close-circle-outline" : "alert-circle-outline"} size={14} color={pillFg} />
                <Text variant="bodySmall" style={{ color: pillFg, marginLeft: 4, flex: 1 }}>{reason}</Text>
              </View>
            )}
          </Card.Content>
        </Pressable>

        {isExpanded && !locked && (
          <Card.Content style={styles.cardContentExpanded}>
            <Divider style={styles.cardDivider} />
            <Text style={styles.sectionLabel}>
              {t("entrega.invoiceDetailsLabel")} · {checked}/{productos.length}
            </Text>
            {productos.map((prod, idx) => {
              const isChecked = checkedItems[item.rutaDetalleId]?.has(prod.codigoProducto) ?? false;
              return (
                <Pressable
                  key={`${prod.codigoProducto}-${idx}`}
                  onPress={() => toggleItem(item.rutaDetalleId, prod.codigoProducto)}
                  style={[styles.itemCard, { backgroundColor: isChecked ? status.positive.container : theme.custom.colors.fill, borderColor: isChecked ? status.positive.base : "transparent" }]}
                >
                  <Checkbox status={isChecked ? "checked" : "unchecked"} onPress={() => toggleItem(item.rutaDetalleId, prod.codigoProducto)} color={status.positive.base} />
                  <View style={styles.itemInfo}>
                    <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: "700", lineHeight: 20 }} numberOfLines={2}>
                      {prod.descripcion || prod.codigoProducto}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }} numberOfLines={1}>{prod.codigoProducto}</Text>
                  </View>
                  <View style={styles.qtyBox}>
                    <Text style={styles.qtyNum}>{prod.cantidad}</Text>
                    {!!prod.unidad && <Text style={styles.qtyUnit} numberOfLines={1}>{prod.unidad}</Text>}
                  </View>
                </Pressable>
              );
            })}

            <Button mode="contained" buttonColor={status.positive.base} onPress={() => handleConfirm(item)} loading={isBusy && complete} disabled={!complete || isBusy} icon="truck-check" style={styles.actionBtn} contentStyle={styles.actionBtnContent} labelStyle={styles.actionBtnLabel}>
              {t("entrega.confirmLoad")}
            </Button>
            {!complete && (
              <>
                <Text variant="bodySmall" style={{ color: theme.custom.status.warning.base, marginTop: 8, marginBottom: 2, textAlign: "center" }}>
                  {t("entrega.itemsMissing", { count: missing })}
                </Text>
                <Button mode="outlined" textColor={theme.custom.status.warning.base} onPress={() => { setIssueNote(""); setIssueTarget(item); }} loading={isBusy && !complete} disabled={isBusy} icon="alert-circle-outline" style={styles.issueBtn}>
                  {t("entrega.confirmWithIssue")}
                </Button>
                <Button mode="outlined" textColor={status.negative.base} onPress={() => { setDeclineNote(""); setDeclineTarget(item); }} disabled={isBusy} icon="close-circle-outline" style={styles.declineBtn}>
                  {t("entrega.declineInvoice")}
                </Button>
              </>
            )}
          </Card.Content>
        )}
      </Card>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: theme.colors.background }]} edges={["left", "right"]}>
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={{ marginTop: 16, color: theme.colors.onSurfaceVariant }}>{t("common.loading")}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={["left", "right"]}>
      {!!veh && (
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Icon source="truck" size={16} color={theme.colors.primary} />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurface, marginLeft: 6 }}>{veh}</Text>
          </View>
        </View>
      )}

      <View style={styles.progress}>
        <View style={styles.progressHeaderRow}>
          <Text style={styles.progressLabel}>{t("entrega.loadingProgressLabel")}</Text>
          <Text style={[styles.progressMetric, { color: allLoaded ? status.positive.base : theme.colors.primary }]}>
            {t("entrega.clientsShort", { loaded: loadedC, total: totalC })}
          </Text>
        </View>
        <ProgressBar progress={totalC > 0 ? loadedC / totalC : 0} color={allLoaded ? status.positive.base : theme.colors.primary} style={styles.progressBar} />
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(item) => String(item.rutaDetalleId)}
        renderItem={renderCard}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      />

      {allLoaded && (
        <View style={styles.dispatchBar}>
          <Button mode="contained" buttonColor={status.positive.base} icon="truck-fast" loading={dispatching} disabled={dispatching} onPress={handleDispatch} contentStyle={{ minHeight: 50 }} labelStyle={styles.actionBtnLabel}>
            {t("entrega.dispatchRoute")}
          </Button>
        </View>
      )}

      <Portal>
        <Dialog visible={!!issueTarget} onDismiss={() => setIssueTarget(null)}>
          <Dialog.Title>{t("entrega.confirmWithIssue")}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
              {t("entrega.issueHint")}
            </Text>
            <TextInput mode="outlined" value={issueNote} onChangeText={setIssueNote} placeholder={t("entrega.issuePlaceholder")} multiline numberOfLines={2} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setIssueTarget(null)}>{t("common.cancel")}</Button>
            <Button textColor={theme.custom.status.warning.base} onPress={submitIssue}>{t("entrega.confirmWithIssue")}</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={!!declineTarget} onDismiss={() => setDeclineTarget(null)}>
          <Dialog.Title>{t("entrega.declineInvoice")}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
              {t("entrega.declineHint")}
            </Text>
            <TextInput mode="outlined" value={declineNote} onChangeText={setDeclineNote} placeholder={t("entrega.reasonPlaceholder")} multiline numberOfLines={2} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeclineTarget(null)}>{t("common.cancel")}</Button>
            <Button textColor={status.negative.base} onPress={handleDecline}>{t("entrega.declineInvoice")}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={!!error} onDismiss={() => setError("")} duration={4000} action={{ label: t("common.retry"), onPress: () => { setError(""); loadCarga(); } }}>{error}</Snackbar>
      <Snackbar visible={!!success} onDismiss={() => setSuccess("")} duration={2000}>{success}</Snackbar>
    </SafeAreaView>
  );
}

const PROGRESS_BAR_HEIGHT = 8;

const createStyles = (theme: CustomTheme) => {
  const { colors, radius, type, surface } = theme.custom;
  return StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
    infoCard: { ...surface.card, marginHorizontal: 16, marginTop: 12, padding: 12, gap: 4 },
    infoRow: { flexDirection: "row", alignItems: "center" },
    progress: { ...surface.card, marginHorizontal: 16, marginTop: 12, marginBottom: 4, padding: 16 },
    progressHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    progressLabel: { ...type.caption, fontWeight: "600", color: colors.inkSecondary },
    progressMetric: { ...type.overline, fontWeight: "800" },
    progressBar: { height: PROGRESS_BAR_HEIGHT, borderRadius: PROGRESS_BAR_HEIGHT / 2 },
    card: { borderRadius: radius.container, borderLeftWidth: 5 },
    cardContent: { paddingVertical: 14, paddingHorizontal: 16 },
    cardContentExpanded: { paddingTop: 2, paddingBottom: 16, paddingHorizontal: 16 },
    header: { flexDirection: "row", alignItems: "center", gap: 12 },
    seqBadge: { width: 38, height: 38, borderRadius: radius.segment, justifyContent: "center", alignItems: "center" },
    // Drawn on the solid status tone, so it takes the page colour (white in light, near-black in dark).
    seqText: { ...type.figure(15), color: colors.background },
    metaRow: { flexDirection: "row", alignItems: "center", marginTop: 12 },
    addrRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 3 },
    reasonBox: { flexDirection: "row", alignItems: "flex-start", marginTop: 8, padding: 8, borderRadius: radius.segment },
    dispatchBar: { ...surface.floating, padding: 16 },
    invoiceText: { ...type.rowTitle, marginLeft: 6 },
    cardDivider: { marginTop: 12, marginBottom: 10 },
    sectionLabel: { ...type.overline, marginBottom: 10 },
    itemCard: { flexDirection: "row", alignItems: "center", borderRadius: radius.segment, borderWidth: 1, paddingVertical: 8, paddingLeft: 4, paddingRight: 10, marginBottom: 8, minHeight: 64 },
    itemInfo: { flex: 1, marginLeft: 2, marginRight: 8 },
    qtyBox: { minWidth: 48, alignItems: "center", justifyContent: "center", paddingLeft: 8 },
    qtyNum: type.figure(24),
    qtyUnit: { ...type.overline, marginTop: 1 },
    actionBtn: { marginTop: 8, borderRadius: radius.control },
    actionBtnContent: { minHeight: 50 },
    actionBtnLabel: { fontSize: type.bodySmall.fontSize, fontWeight: "700", letterSpacing: 0.3 },
    issueBtn: { marginTop: 8, borderRadius: radius.control, borderColor: theme.custom.status.warning.base },
    declineBtn: { marginTop: 8, borderRadius: radius.control, borderColor: theme.custom.status.negative.base },
  });
};
