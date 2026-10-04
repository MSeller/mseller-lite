import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
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
import { preparacionService } from "../../../services/preparacionService";
import { CargaCliente, CargaResponse, ItemCargaFaltante } from "../../../types/preparacion";
import SectionAccessGate from "../../../components/navigation/SectionAccessGate";
import EmptyState from "../../../components/ui/EmptyState";
import PrepFooter from "../../../components/preparacion/PrepFooter";
import ProgressSummaryCard from "../../../components/preparacion/ProgressSummaryCard";
import StatusChip from "../../../components/ui/StatusChip";
import AppButton from "../../../components/ui/AppButton";

const VEHICLE_TYPE_KEYS: Record<string, string> = {
  camion: "preparacion.ui.vehicleType.camion",
  furgoneta: "preparacion.ui.vehicleType.furgoneta",
  motocicleta: "preparacion.ui.vehicleType.motocicleta",
};

const vehiculoTipoLabel = (t: (key: string) => string, tipo?: string | null) => {
  if (!tipo) return "";
  return t(VEHICLE_TYPE_KEYS[tipo] ?? "preparacion.ui.vehicleType.other");
};

function LoadingScreen() {
  const theme = useTheme() as CustomTheme;
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme, gutterFor(width)), [theme, width]);
  const { status, colors } = theme.custom;
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
      const response = await preparacionService.getCarga(numericRutaId);
      setData(response);
      const checks: Record<number, Set<string>> = {};
      for (const c of response.clientes ?? []) checks[c.rutaDetalleId] = new Set();
      setCheckedItems(checks);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e.response?.data?.message || e.message || t("preparacion.errorLoadingCarga"));
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
      const response = await preparacionService.confirmarCarga(numericRutaId, item.rutaDetalleId, body);
      markConfirmed(item.rutaDetalleId, hasIssue, observacion);
      setExpandedId(null);
      if (response.rutaDespachada) {
        setSuccess(t("preparacion.routeDispatched"));
      } else {
        setSuccess(hasIssue ? t("preparacion.loadedWithIssue") : t("preparacion.clientLoaded"));
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || t("preparacion.errorConfirmingLoad"));
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
      await preparacionService.rechazarCarga(numericRutaId, item.rutaDetalleId, note || undefined);
      setDeclined((prev) => ({ ...prev, [item.rutaDetalleId]: note }));
      setExpandedId(null);
      setDeclineNote("");
      setSuccess(t("preparacion.invoiceDeclined"));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || t("preparacion.errorDeclining"));
    } finally {
      setBusy(null);
    }
  };

  const sorted = [...(data?.clientes ?? [])].sort((a, b) => b.secuenciaEntrega - a.secuenciaEntrega);
  const activeCards = sorted.filter((c) => !declined[c.rutaDetalleId]);
  const totalC = activeCards.length;
  const loadedC = activeCards.filter((c) => c.confirmado).length;
  const allLoaded = totalC > 0 && loadedC === totalC;

  const handleDispatch = async () => {
    const firstLoaded = activeCards.find((c) => c.confirmado);
    if (!firstLoaded) return;
    try {
      setDispatching(true);
      setError("");
      const response = await preparacionService.confirmarCarga(numericRutaId, firstLoaded.rutaDetalleId);
      if (response.rutaDespachada) {
        setSuccess(t("preparacion.routeDispatched"));
      } else {
        setError(t("preparacion.errorConfirmingLoad"));
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || t("preparacion.errorConfirmingLoad"));
    } finally {
      setDispatching(false);
    }
  };
  const veh = data ? [vehiculoTipoLabel(t, data.vehiculoTipo), data.vehiculoPlaca].filter(Boolean).join(" · ") : "";

  const renderCard = ({ item }: { item: CargaCliente }) => {
    const isExpanded = expandedId === item.rutaDetalleId;
    const productos = item.productos ?? [];
    const checked = checkedCount(item);

    const isDeclined = !!declined[item.rutaDetalleId];
    const reason = isDeclined ? declined[item.rutaDetalleId] : item.conIncidencia ? item.cargaObservacion : undefined;
    const locked = item.confirmado || isDeclined;

    const toneKey = isDeclined ? "negative" : item.confirmado ? (item.conIncidencia ? "warning" : "positive") : "warning";
    const tone = status[toneKey];
    const pillText = isDeclined
      ? t("preparacion.declined")
      : item.confirmado
        ? item.conIncidencia ? t("preparacion.loadedWithIssueShort") : t("preparacion.loaded")
        : t("preparacion.pending");
    // Done states replace the stop number with an icon; a pending stop keeps its number.
    const stateIcon = isDeclined ? "close-circle" : item.confirmado ? (item.conIncidencia ? "alert-circle" : "check-circle") : null;

    return (
      <View>
        <Pressable
          onPress={() => !locked && setExpandedId((p) => (p === item.rutaDetalleId ? null : item.rutaDetalleId))}
          disabled={locked}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          accessibilityRole={locked ? undefined : "button"}
          accessibilityState={locked ? undefined : { expanded: isExpanded }}
          accessibilityLabel={[
            `${item.secuenciaEntrega}. ${item.nombreCliente}`,
            item.codigoCliente,
            item.direccion,
            `${t("preparacion.invoiceLabel")} ${item.noFactura}`,
            t("preparacion.ui.itemCount", { count: productos.length }),
            pillText,
            reason,
          ]
            .filter(Boolean)
            .join(", ")}
        >
          <View style={styles.lead}>
            {stateIcon ? (
              <Icon source={stateIcon} size={28} color={tone.base} />
            ) : (
              <View style={styles.seqWell}>
                <Text style={styles.seqText}>{item.secuenciaEntrega}</Text>
              </View>
            )}
          </View>

          <View style={styles.rowBody}>
            <View style={styles.rowTop}>
              <Text style={styles.clientName} numberOfLines={1}>{item.nombreCliente}</Text>
              <StatusChip tone={toneKey} label={pillText} />
            </View>
            <Text style={styles.caption} numberOfLines={1}>{item.codigoCliente}</Text>
            {!!item.direccion && (
              <View style={styles.inlineRow}>
                <Icon source="map-marker-outline" size={14} color={colors.inkTertiary} />
                <Text style={[styles.caption, styles.flex]} numberOfLines={2}>{item.direccion}</Text>
              </View>
            )}
            <View style={styles.invoiceRow}>
              <Icon source="file-document-outline" size={16} color={colors.inkSecondary} />
              <Text style={styles.invoiceText} numberOfLines={1}>{item.noFactura}</Text>
              <Text style={[styles.caption, styles.flex]} numberOfLines={1}>
                {`· ${t("preparacion.ui.itemCount", { count: productos.length })}`}
              </Text>
            </View>
            {!!reason && (
              <View style={styles.inlineRow}>
                <Icon source={isDeclined ? "close-circle-outline" : "alert-circle-outline"} size={14} color={tone.base} />
                <Text style={[styles.reasonText, { color: tone.base }]}>{reason}</Text>
              </View>
            )}
          </View>

          {!locked && <Icon source={isExpanded ? "chevron-up" : "chevron-down"} size={22} color={colors.tint} />}
        </Pressable>

        {isExpanded && !locked && (
          <View style={styles.detail}>
            <Text style={styles.detailLabel}>
              {`${t("preparacion.invoiceDetailsLabel")} · ${checked}/${productos.length}`}
            </Text>
            {productos.map((prod, idx) => {
              const isChecked = checkedItems[item.rutaDetalleId]?.has(prod.codigoProducto) ?? false;
              return (
                <Pressable
                  key={`${prod.codigoProducto}-${idx}`}
                  onPress={() => toggleItem(item.rutaDetalleId, prod.codigoProducto)}
                  style={({ pressed }) => [styles.itemRow, pressed && styles.rowPressed]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isChecked }}
                  accessibilityLabel={`${prod.descripcion || prod.codigoProducto}, ${prod.cantidad}${prod.unidad ? ` ${prod.unidad}` : ""}`}
                >
                  <Icon
                    source={isChecked ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
                    size={24}
                    color={isChecked ? status.positive.base : colors.inkTertiary}
                  />
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {prod.descripcion || prod.codigoProducto}
                    </Text>
                    <Text style={styles.caption} numberOfLines={1}>{prod.codigoProducto}</Text>
                  </View>
                  <View style={styles.qtyBox}>
                    <Text style={styles.qtyNum}>{prod.cantidad}</Text>
                    {!!prod.unidad && <Text style={styles.qtyUnit} numberOfLines={1}>{prod.unidad}</Text>}
                  </View>
                </Pressable>
              );
            })}

            {!allChecked(item) && (
              <View style={styles.issueActions}>
                <Text style={styles.missingText}>
                  {t("preparacion.itemsMissing", { count: productos.length - checked })}
                </Text>
                <Pressable
                  onPress={() => { setIssueNote(""); setIssueTarget(item); }}
                  disabled={busy === item.rutaDetalleId}
                  style={styles.quickAction}
                  accessibilityRole="button"
                  hitSlop={8}
                >
                  {busy === item.rutaDetalleId ? (
                    <ActivityIndicator size="small" color={status.warning.base} />
                  ) : (
                    <Icon source="alert-circle-outline" size={20} color={status.warning.base} />
                  )}
                  <Text style={[styles.quickActionLabel, { color: status.warning.base }]}>
                    {t("preparacion.confirmWithIssue")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => { setDeclineNote(""); setDeclineTarget(item); }}
                  disabled={busy === item.rutaDetalleId}
                  style={styles.quickAction}
                  accessibilityRole="button"
                  hitSlop={8}
                >
                  <Icon source="close-circle-outline" size={20} color={status.negative.base} />
                  <Text style={[styles.quickActionLabel, { color: status.negative.base }]}>
                    {t("preparacion.declineInvoice")}
                  </Text>
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
      <SafeAreaView style={styles.centered} edges={["left", "right"]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={styles.loadingText}>{t("preparacion.loadingData")}</Text>
      </SafeAreaView>
    );
  }

  // The open invoice's confirm is the screen's primary action until every stop is loaded;
  // then dispatching the route is.
  const expandedItem = activeCards.find((c) => c.rutaDetalleId === expandedId && !c.confirmado);
  const expandedComplete = expandedItem ? allChecked(expandedItem) : false;
  const expandedBusy = !!expandedItem && busy === expandedItem.rutaDetalleId;

  const listHeader = (
    <View>
      <ProgressSummaryCard
        overline={t("preparacion.loadingProgressLabel")}
        title={data?.noRuta}
        done={loadedC}
        total={totalC}
        caption={t("preparacion.ui.customersLoaded")}
        meta={veh ? { icon: "truck-outline", label: veh } : undefined}
        style={styles.summaryCard}
      />
      {sorted.length > 0 && (
        <View style={styles.listHeader}>
          <Text style={styles.overline}>
            {`${t("preparacion.deliveryOrder")} · ${t("preparacion.ui.customerCount", { count: sorted.length })}`}
          </Text>
          <Text style={styles.caption}>{t("preparacion.loadingSubtitle")}</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <FlatList
        data={sorted}
        keyExtractor={(item) => String(item.rutaDetalleId ?? `${item.codigoCliente}-${item.secuenciaEntrega}`)}
        renderItem={renderCard}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          !data && !!error ? (
            <EmptyState
              icon="alert-circle-outline"
              title={t("preparacion.errorLoadingCarga")}
              message={error}
              action={{ label: t("common.retry"), icon: "refresh", onPress: loadCarga }}
            />
          ) : (
            <EmptyState
              icon="truck-outline"
              title={t("preparacion.ui.noCustomersToLoad")}
              message={t("preparacion.ui.noCustomersToLoadBody")}
            />
          )
        }
      />

      {allLoaded ? (
        <PrepFooter
          label={t("preparacion.dispatchRoute")}
          icon="truck-fast"
          onPress={handleDispatch}
          loading={dispatching}
        />
      ) : expandedItem ? (
        <PrepFooter
          label={t("preparacion.confirmLoad")}
          icon="truck-check"
          onPress={() => handleConfirm(expandedItem)}
          disabled={!expandedComplete}
          loading={expandedBusy && expandedComplete}
          summary={
            <View>
              <Text style={styles.overline} numberOfLines={1}>{expandedItem.nombreCliente}</Text>
              <Text style={styles.footerFigure}>
                {`${checkedCount(expandedItem)}/${(expandedItem.productos ?? []).length}`}
              </Text>
            </View>
          }
        />
      ) : null}

      <Portal>
        <Dialog visible={!!issueTarget} onDismiss={() => setIssueTarget(null)}>
          <Dialog.Title>{t("preparacion.confirmWithIssue")}</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogHint}>{t("preparacion.issueHint")}</Text>
            <TextInput mode="outlined" value={issueNote} onChangeText={setIssueNote} placeholder={t("preparacion.issuePlaceholder")} multiline numberOfLines={2} />
          </Dialog.Content>
          <Dialog.Actions>
            <AppButton onPress={() => setIssueTarget(null)}>{t("common.cancel")}</AppButton>
            <AppButton textColor={status.warning.base} onPress={submitIssue}>{t("preparacion.confirmWithIssue")}</AppButton>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={!!declineTarget} onDismiss={() => setDeclineTarget(null)}>
          <Dialog.Title>{t("preparacion.declineInvoice")}</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogHint}>{t("preparacion.declineHint")}</Text>
            <TextInput mode="outlined" value={declineNote} onChangeText={setDeclineNote} placeholder={t("preparacion.reasonPlaceholder")} multiline numberOfLines={2} />
          </Dialog.Content>
          <Dialog.Actions>
            <AppButton onPress={() => setDeclineTarget(null)}>{t("common.cancel")}</AppButton>
            <AppButton textColor={status.negative.base} onPress={handleDecline}>{t("preparacion.declineInvoice")}</AppButton>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* The empty state already shows a failure with nothing loaded. */}
      <Snackbar visible={!!error && !!data} onDismiss={() => setError("")} duration={4000} action={{ label: t("common.retry"), onPress: () => { setError(""); loadCarga(); } }}>{error}</Snackbar>
      <Snackbar visible={!!success} onDismiss={() => setSuccess("")} duration={2000}>{success}</Snackbar>
    </SafeAreaView>
  );
}

const SEQ_SIZE = 32;

const createStyles = (theme: CustomTheme, gutter: number) => {
  const { colors, spacing, type, hairline, touchTarget } = theme.custom;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.lg, backgroundColor: colors.background },
    loadingText: { ...type.bodySmall },
    flex: { flex: 1 },
    summaryCard: { marginHorizontal: gutter, marginTop: spacing.md },
    listHeader: { paddingHorizontal: gutter, paddingTop: spacing.xl, paddingBottom: spacing.md, gap: spacing.xs, borderBottomWidth: hairline, borderBottomColor: colors.hairline },
    overline: { ...type.overline },
    caption: { ...type.caption },
    listContent: { paddingBottom: spacing.xxl, flexGrow: 1 },
    row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, paddingHorizontal: gutter, paddingVertical: spacing.md, borderBottomWidth: hairline, borderBottomColor: colors.hairline },
    rowPressed: { backgroundColor: colors.fill },
    lead: { width: SEQ_SIZE, alignItems: "center", paddingTop: spacing.xs / 2 },
    // A circle: the radius is half the well's own size (geometry, not a token).
    seqWell: { width: SEQ_SIZE, height: SEQ_SIZE, borderRadius: SEQ_SIZE / 2, backgroundColor: colors.fill, alignItems: "center", justifyContent: "center" },
    seqText: { ...type.figure(15) },
    rowBody: { flex: 1, minWidth: 0, gap: spacing.xs / 2 },
    rowTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    clientName: { ...type.rowTitle, flex: 1 },
    inlineRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.xs },
    invoiceRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.xs },
    invoiceText: { ...type.figure(15) },
    reasonText: { ...type.caption, flex: 1 },
    // Nested under the stop it belongs to: the raised child-row tone, indented past the stop number.
    detail: { backgroundColor: colors.surfaceRaised, paddingLeft: gutter + SEQ_SIZE + spacing.md, paddingRight: gutter, paddingTop: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: hairline, borderBottomColor: colors.hairline },
    detailLabel: { ...type.overline, marginBottom: spacing.xs },
    itemRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: touchTarget + spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: hairline, borderBottomColor: colors.hairline },
    itemInfo: { flex: 1, minWidth: 0 },
    itemName: { ...type.body, fontWeight: "600" },
    qtyBox: { minWidth: touchTarget, alignItems: "flex-end" },
    qtyNum: { ...type.figure(22) },
    qtyUnit: { ...type.caption, fontWeight: "600", textTransform: "uppercase" },
    issueActions: { paddingTop: spacing.sm },
    missingText: { ...type.caption, fontWeight: "600", color: colors.warningForeground },
    quickAction: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: touchTarget },
    quickActionLabel: { ...type.body },
    footerFigure: { ...type.figure(22) },
    dialogHint: { ...type.bodySmall, marginBottom: spacing.sm },
  });
};

export default function LoadingScreenRoute() {
  const { t } = useTranslation();
  return (
    <SectionAccessGate section="truckLoading" message={t("preparacion.loadingNotAllowed")}>
      <LoadingScreen />
    </SectionAccessGate>
  );
}
