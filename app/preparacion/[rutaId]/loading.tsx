import { useLocalSearchParams } from "expo-router";
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
import { preparacionService } from "../../../services/preparacionService";
import { CargaCliente, CargaResponse, ItemCargaFaltante } from "../../../types/preparacion";

const vehiculoTipoLabel = (tipo?: string | null) => {
  switch (tipo) {
    case "camion": return "Camión";
    case "furgoneta": return "Furgoneta";
    case "motocicleta": return "Motocicleta";
    default: return tipo ? "Vehículo" : "";
  }
};

export default function LoadingScreen() {
  const theme = useTheme();
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

  const markConfirmed = (id: number, conIncidencia: boolean) =>
    setData((prev) =>
      prev
        ? { ...prev, clientes: prev.clientes.map((c) => (c.rutaDetalleId === id ? { ...c, confirmado: true, conIncidencia } : c)) }
        : prev
    );

  const handleConfirm = async (item: CargaCliente, faltantes?: ItemCargaFaltante[]) => {
    try {
      setBusy(item.rutaDetalleId);
      setError("");
      const response = await preparacionService.confirmarCarga(
        numericRutaId,
        item.rutaDetalleId,
        faltantes && faltantes.length > 0 ? { itemsFaltantes: faltantes } : undefined
      );
      markConfirmed(item.rutaDetalleId, !!(faltantes && faltantes.length));
      setExpandedId(null);
      if (response.rutaDespachada) {
        setSuccess(response.noTransporte ? `${t("preparacion.routeDispatched")} — ${response.noTransporte}` : t("preparacion.routeDispatched"));
      } else {
        setSuccess(faltantes?.length ? t("preparacion.loadedWithIssue") : t("preparacion.clientLoaded"));
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || t("preparacion.errorConfirmingLoad"));
    } finally {
      setBusy(null);
    }
  };

  const handleConfirmWithIssue = (item: CargaCliente) => {
    const checked = checkedItems[item.rutaDetalleId] ?? new Set<string>();
    const faltantes: ItemCargaFaltante[] = (item.productos ?? [])
      .filter((p) => !checked.has(p.codigoProducto))
      .map((p) => ({ codigoProducto: p.codigoProducto, cantidadFaltante: p.cantidad }));
    handleConfirm(item, faltantes);
  };

  const handleDecline = async () => {
    const item = declineTarget;
    if (!item) return;
    try {
      setBusy(item.rutaDetalleId);
      setError("");
      setDeclineTarget(null);
      await preparacionService.rechazarCarga(numericRutaId, item.rutaDetalleId, declineNote || undefined);
      setData((prev) => (prev ? { ...prev, clientes: prev.clientes.filter((c) => c.rutaDetalleId !== item.rutaDetalleId) } : prev));
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
  const totalC = sorted.length;
  const loadedC = sorted.filter((c) => c.confirmado).length;
  const allLoaded = totalC > 0 && loadedC === totalC;
  const veh = data ? [vehiculoTipoLabel(data.vehiculoTipo), data.vehiculoPlaca].filter(Boolean).join(" · ") : "";

  const renderCard = ({ item }: { item: CargaCliente }) => {
    const isBusy = busy === item.rutaDetalleId;
    const isExpanded = expandedId === item.rutaDetalleId;
    const productos = item.productos ?? [];
    const checked = checkedCount(item);
    const complete = allChecked(item);
    const missing = productos.length - checked;

    const accent = item.confirmado ? (item.conIncidencia ? "#B26A00" : "#2E7D32") : theme.colors.primary;
    const pillBg = item.confirmado ? (item.conIncidencia ? "#FFF4E5" : "#E7F5E9") : "#FFF4E5";
    const pillFg = item.confirmado ? (item.conIncidencia ? "#B26A00" : "#2E7D32") : "#E8820C";
    const pillText = item.confirmado
      ? item.conIncidencia ? t("preparacion.loadedWithIssueShort") : t("preparacion.loaded")
      : t("preparacion.pending");

    return (
      <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderLeftColor: accent, opacity: item.confirmado ? 0.75 : 1 }]}>
        <Pressable onPress={() => !item.confirmado && setExpandedId((p) => (p === item.rutaDetalleId ? null : item.rutaDetalleId))}>
          <Card.Content>
            <View style={styles.header}>
              <View style={[styles.seqBadge, { backgroundColor: accent }]}>
                {item.confirmado ? <Icon source="check" size={18} color="#FFFFFF" /> : <Text style={styles.seqText}>{item.secuenciaEntrega}</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={{ fontWeight: "bold", color: theme.colors.onSurface }} numberOfLines={1}>{item.nombreCliente}</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>{item.codigoCliente}</Text>
              </View>
              <Chip compact icon={item.confirmado ? "check" : "clock-outline"} style={{ backgroundColor: pillBg }} textStyle={{ color: pillFg, fontSize: 11, fontWeight: "700" }}>
                {pillText}
              </Chip>
            </View>
            <View style={styles.metaRow}>
              <Icon source="file-document-outline" size={16} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 6, flex: 1 }} numberOfLines={1}>
                {t("preparacion.invoiceLabel")} {item.noFactura} · {productos.length} {t("preparacion.items")}
              </Text>
              {!item.confirmado && <Icon source={isExpanded ? "chevron-up" : "chevron-down"} size={22} color={theme.colors.onSurfaceVariant} />}
            </View>
          </Card.Content>
        </Pressable>

        {isExpanded && !item.confirmado && (
          <Card.Content style={{ paddingTop: 0 }}>
            <Divider style={styles.cardDivider} />
            <Text style={[styles.sectionLabel, { color: theme.colors.primary }]}>
              {t("preparacion.invoiceDetailsLabel")} · {checked}/{productos.length}
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
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: "600" }} numberOfLines={1}>{prod.codigoProducto}</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>{prod.descripcion}{prod.unidad ? ` · ${prod.unidad}` : ""}</Text>
                  </View>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{prod.cantidad}</Text>
                </Pressable>
              );
            })}

            <Button mode="contained" buttonColor="#2E7D32" onPress={() => handleConfirm(item)} loading={isBusy && complete} disabled={!complete || isBusy} icon="truck-check" style={styles.actionBtn} contentStyle={styles.actionBtnContent} labelStyle={styles.actionBtnLabel}>
              {t("preparacion.confirmLoad")}
            </Button>
            {!complete && (
              <>
                <Text variant="bodySmall" style={{ color: "#B26A00", marginTop: 8, marginBottom: 2, textAlign: "center" }}>
                  {t("preparacion.itemsMissing", { count: missing })}
                </Text>
                <Button mode="outlined" textColor="#B26A00" onPress={() => handleConfirmWithIssue(item)} loading={isBusy && !complete} disabled={isBusy} icon="alert-circle-outline" style={styles.issueBtn}>
                  {t("preparacion.confirmWithIssue")}
                </Button>
                <Button mode="outlined" textColor="#C62828" onPress={() => { setDeclineNote(""); setDeclineTarget(item); }} disabled={isBusy} icon="close-circle-outline" style={styles.declineBtn}>
                  {t("preparacion.declineInvoice")}
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
      <SafeAreaView style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={{ marginTop: 16, color: theme.colors.onSurfaceVariant }}>{t("preparacion.loadingData")}</Text>
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
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 6 }}>{t("preparacion.transportLabel")} {data.noTransporte}</Text>
            </View>
          )}
        </View>
      )}

      <View style={[styles.progress, { backgroundColor: theme.colors.surface, borderColor: theme.colors.surfaceVariant }]}>
        <View style={styles.progressHeaderRow}>
          <Text style={[styles.progressLabel, { color: theme.colors.onSurfaceVariant }]}>{t("preparacion.loadingProgressLabel")}</Text>
          <Text style={[styles.progressMetric, { color: allLoaded ? "#2E7D32" : theme.colors.primary }]}>
            {t("preparacion.loadingClientsShort", { loaded: loadedC, total: totalC })}
          </Text>
        </View>
        <ProgressBar progress={totalC > 0 ? loadedC / totalC : 0} color={allLoaded ? "#2E7D32" : theme.colors.primary} style={styles.progressBar} />
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(item) => String(item.rutaDetalleId ?? `${item.codigoCliente}-${item.secuenciaEntrega}`)}
        renderItem={renderCard}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      <Portal>
        <Dialog visible={!!declineTarget} onDismiss={() => setDeclineTarget(null)}>
          <Dialog.Title>{t("preparacion.declineInvoice")}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>{t("preparacion.declineHint")}</Text>
            <TextInput mode="outlined" value={declineNote} onChangeText={setDeclineNote} placeholder={t("preparacion.reasonPlaceholder")} multiline numberOfLines={2} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeclineTarget(null)}>{t("common.cancel")}</Button>
            <Button textColor="#C62828" onPress={handleDecline}>{t("preparacion.declineInvoice")}</Button>
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
  listContent: { padding: 16, paddingBottom: 120 },
  separator: { height: 10 },
  card: { borderRadius: 6, borderLeftWidth: 5, elevation: 2 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  seqBadge: { width: 38, height: 38, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  seqText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  cardDivider: { marginTop: 12, marginBottom: 10 },
  sectionLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 },
  itemCard: { flexDirection: "row", alignItems: "center", borderRadius: 6, borderWidth: 1, paddingVertical: 6, paddingLeft: 4, paddingRight: 10, marginBottom: 8, minHeight: 56 },
  itemInfo: { flex: 1, marginLeft: 2, marginRight: 8 },
  actionBtn: { marginTop: 8, borderRadius: 6 },
  actionBtnContent: { minHeight: 50 },
  actionBtnLabel: { fontSize: 15, fontWeight: "700", letterSpacing: 0.3 },
  issueBtn: { marginTop: 8, borderRadius: 6, borderColor: "#E6C08A" },
  declineBtn: { marginTop: 8, borderRadius: 6, borderColor: "#E7B4B4" },
});
