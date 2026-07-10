import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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
import { useTranslation } from "@/hooks/useTranslation";
import { entregaService } from "../../../services/entregaService";
import { CargaCliente, CargaResponse, ItemCargaFaltante } from "../../../types/preparacion";
import { vehiculoLabel } from "../../../utils/mapLinks";

export default function CargaScreen() {
  const theme = useTheme();
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
        setTimeout(() => router.back(), 900);
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

    const pillBg = isDeclined ? "#FDECEA" : item.confirmado ? (item.conIncidencia ? "#FFF4E5" : "#E7F5E9") : "#FFF4E5";
    const pillFg = isDeclined ? "#C62828" : item.confirmado ? (item.conIncidencia ? "#B26A00" : "#2E7D32") : "#E8820C";
    const statusColor = pillFg;
    const pillText = isDeclined
      ? t("entrega.declined")
      : item.confirmado
        ? item.conIncidencia
          ? t("entrega.loadedWithIssueShort")
          : t("entrega.loaded")
        : t("entrega.pending");
    const pillIcon = isDeclined ? "close-circle" : item.confirmado ? "check" : "clock-outline";

    return (
      <Card
        style={[
          styles.card,
          { backgroundColor: theme.colors.surface, borderLeftColor: statusColor, opacity: locked ? 0.8 : 1 },
        ]}
      >
        <Pressable onPress={() => !locked && setExpandedId((p) => (p === item.rutaDetalleId ? null : item.rutaDetalleId))}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.header}>
              <View style={[styles.seqBadge, { backgroundColor: statusColor }]}>
                {isDeclined ? <Icon source="close" size={18} color="#FFFFFF" /> : item.confirmado ? <Icon source="check" size={18} color="#FFFFFF" /> : <Text style={styles.seqText}>{item.secuenciaEntrega}</Text>}
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
              <Chip compact icon={pillIcon} style={{ backgroundColor: pillBg }} textStyle={{ color: pillFg, fontSize: 11, fontWeight: "700" }}>
                {pillText}
              </Chip>
            </View>
            <View style={styles.metaRow}>
              <Icon source="file-document-outline" size={18} color={theme.colors.primary} />
              <Text style={[styles.invoiceText, { color: theme.colors.primary }]} numberOfLines={1}>{item.noFactura}</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 8, flex: 1 }} numberOfLines={1}>· {productos.length} {t("entrega.items")}</Text>
              {!locked && <Icon source={isExpanded ? "chevron-up" : "chevron-down"} size={22} color={theme.colors.onSurfaceVariant} />}
            </View>
            {!!reason && (
              <View style={[styles.reasonBox, { backgroundColor: isDeclined ? "#FDECEA" : "#FFF4E5" }]}>
                <Icon source={isDeclined ? "close-circle-outline" : "alert-circle-outline"} size={14} color={pillFg} />
                <Text variant="bodySmall" style={{ color: pillFg, marginLeft: 4, flex: 1 }}>{reason}</Text>
              </View>
            )}
          </Card.Content>
        </Pressable>

        {isExpanded && !locked && (
          <Card.Content style={styles.cardContentExpanded}>
            <Divider style={styles.cardDivider} />
            <Text style={[styles.sectionLabel, { color: theme.colors.primary }]}>
              {t("entrega.invoiceDetailsLabel")} · {checked}/{productos.length}
            </Text>
            {productos.map((prod, idx) => {
              const isChecked = checkedItems[item.rutaDetalleId]?.has(prod.codigoProducto) ?? false;
              return (
                <Pressable
                  key={`${prod.codigoProducto}-${idx}`}
                  onPress={() => toggleItem(item.rutaDetalleId, prod.codigoProducto)}
                  style={[styles.itemCard, { backgroundColor: isChecked ? "#EAF4EC" : theme.colors.surfaceVariant, borderColor: isChecked ? "#ABD9B3" : "transparent" }]}
                >
                  <Checkbox status={isChecked ? "checked" : "unchecked"} onPress={() => toggleItem(item.rutaDetalleId, prod.codigoProducto)} color="#2E7D32" />
                  <View style={styles.itemInfo}>
                    <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: "700", lineHeight: 20 }} numberOfLines={2}>
                      {prod.descripcion || prod.codigoProducto}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }} numberOfLines={1}>{prod.codigoProducto}</Text>
                  </View>
                  <View style={styles.qtyBox}>
                    <Text style={[styles.qtyNum, { color: theme.colors.onSurface }]}>{prod.cantidad}</Text>
                    {!!prod.unidad && <Text style={[styles.qtyUnit, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>{prod.unidad}</Text>}
                  </View>
                </Pressable>
              );
            })}

            <Button mode="contained" buttonColor="#2E7D32" onPress={() => handleConfirm(item)} loading={isBusy && complete} disabled={!complete || isBusy} icon="truck-check" style={styles.actionBtn} contentStyle={styles.actionBtnContent} labelStyle={styles.actionBtnLabel}>
              {t("entrega.confirmLoad")}
            </Button>
            {!complete && (
              <>
                <Text variant="bodySmall" style={{ color: "#B26A00", marginTop: 8, marginBottom: 2, textAlign: "center" }}>
                  {t("entrega.itemsMissing", { count: missing })}
                </Text>
                <Button mode="outlined" textColor="#B26A00" onPress={() => { setIssueNote(""); setIssueTarget(item); }} loading={isBusy && !complete} disabled={isBusy} icon="alert-circle-outline" style={styles.issueBtn}>
                  {t("entrega.confirmWithIssue")}
                </Button>
                <Button mode="outlined" textColor="#C62828" onPress={() => { setDeclineNote(""); setDeclineTarget(item); }} disabled={isBusy} icon="close-circle-outline" style={styles.declineBtn}>
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
      {(!!veh || !!data?.noTransporte) && (
        <View style={[styles.infoCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.surfaceVariant }]}>
          {!!veh && (
            <View style={styles.infoRow}>
              <Icon source="truck" size={16} color={theme.colors.primary} />
              <Text variant="bodySmall" style={{ color: theme.colors.onSurface, marginLeft: 6 }}>{veh}</Text>
            </View>
          )}
          {!!data?.noTransporte && (
            <View style={styles.infoRow}>
              <Icon source="receipt" size={16} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 6 }}>{t("entrega.transportLabel")} {data.noTransporte}</Text>
            </View>
          )}
        </View>
      )}

      <View style={[styles.progress, { backgroundColor: theme.colors.surface, borderColor: theme.colors.surfaceVariant }]}>
        <View style={styles.progressHeaderRow}>
          <Text style={[styles.progressLabel, { color: theme.colors.onSurfaceVariant }]}>{t("entrega.loadingProgressLabel")}</Text>
          <Text style={[styles.progressMetric, { color: allLoaded ? "#2E7D32" : theme.colors.primary }]}>
            {t("entrega.clientsShort", { loaded: loadedC, total: totalC })}
          </Text>
        </View>
        <ProgressBar progress={totalC > 0 ? loadedC / totalC : 0} color={allLoaded ? "#2E7D32" : theme.colors.primary} style={styles.progressBar} />
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(item) => String(item.rutaDetalleId)}
        renderItem={renderCard}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      />

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
            <Button textColor="#B26A00" onPress={submitIssue}>{t("entrega.confirmWithIssue")}</Button>
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
            <Button textColor="#C62828" onPress={handleDecline}>{t("entrega.declineInvoice")}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={!!error} onDismiss={() => setError("")} duration={4000} action={{ label: t("common.retry"), onPress: () => { setError(""); loadCarga(); } }}>{error}</Snackbar>
      <Snackbar visible={!!success} onDismiss={() => setSuccess("")} duration={2000}>{success}</Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  infoCard: { marginHorizontal: 16, marginTop: 12, padding: 12, borderRadius: 6, borderWidth: 1, gap: 4 },
  infoRow: { flexDirection: "row", alignItems: "center" },
  progress: { marginHorizontal: 16, marginTop: 12, marginBottom: 4, padding: 16, borderRadius: 6, borderWidth: 1, elevation: 1 },
  progressHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  progressLabel: { fontSize: 13, fontWeight: "600", letterSpacing: 0.2 },
  progressMetric: { fontSize: 13, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" },
  progressBar: { height: 8, borderRadius: 4 },
  card: { borderRadius: 6, borderLeftWidth: 5, elevation: 2 },
  cardContent: { paddingVertical: 14, paddingHorizontal: 16 },
  cardContentExpanded: { paddingTop: 2, paddingBottom: 16, paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  seqBadge: { width: 38, height: 38, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  seqText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  addrRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 3 },
  reasonBox: { flexDirection: "row", alignItems: "flex-start", marginTop: 8, padding: 8, borderRadius: 6 },
  invoiceText: { fontSize: 16, fontWeight: "800", letterSpacing: 0.3, marginLeft: 6 },
  cardDivider: { marginTop: 12, marginBottom: 10 },
  sectionLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 },
  itemCard: { flexDirection: "row", alignItems: "center", borderRadius: 6, borderWidth: 1, paddingVertical: 8, paddingLeft: 4, paddingRight: 10, marginBottom: 8, minHeight: 64 },
  itemInfo: { flex: 1, marginLeft: 2, marginRight: 8 },
  qtyBox: { minWidth: 48, alignItems: "center", justifyContent: "center", paddingLeft: 8 },
  qtyNum: { fontSize: 24, fontWeight: "800", lineHeight: 26 },
  qtyUnit: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", marginTop: 1 },
  actionBtn: { marginTop: 8, borderRadius: 6 },
  actionBtnContent: { minHeight: 50 },
  actionBtnLabel: { fontSize: 15, fontWeight: "700", letterSpacing: 0.3 },
  issueBtn: { marginTop: 8, borderRadius: 6, borderColor: "#E6C08A" },
  declineBtn: { marginTop: 8, borderRadius: 6, borderColor: "#E7B4B4" },
});
