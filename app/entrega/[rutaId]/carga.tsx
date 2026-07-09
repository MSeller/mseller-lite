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
  Divider,
  Icon,
  IconButton,
  ProgressBar,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useTranslation } from "@/hooks/useTranslation";
import { entregaService } from "../../../services/entregaService";
import { CargaCliente, CargaResponse, ItemCargaConfirmacion } from "../../../types/preparacion";

export default function CargaScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { rutaId } = useLocalSearchParams<{ rutaId: string }>();
  const numericRutaId = parseInt(rutaId ?? "0", 10);

  const [data, setData] = useState<CargaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirming, setConfirming] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [itemQtys, setItemQtys] = useState<Record<number, Record<string, number>>>({});
  const [checkedItems, setCheckedItems] = useState<Record<number, Set<string>>>({});

  const loadCarga = useCallback(async () => {
    try {
      setError("");
      const response = await entregaService.getCarga(numericRutaId);
      setData(response);
      const qtys: Record<number, Record<string, number>> = {};
      const checks: Record<number, Set<string>> = {};
      for (const c of response.clientes ?? []) {
        qtys[c.rutaDetalleId] = {};
        checks[c.rutaDetalleId] = new Set();
        for (const p of c.productos ?? []) qtys[c.rutaDetalleId][p.codigoProducto] = p.cantidad;
      }
      setItemQtys(qtys);
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

  const setQty = (id: number, code: string, qty: number) =>
    setItemQtys((prev) => ({ ...prev, [id]: { ...prev[id], [code]: Math.max(0, qty) } }));

  const toggleItem = (id: number, code: string) =>
    setCheckedItems((prev) => {
      const cur = new Set(prev[id] ?? []);
      if (cur.has(code)) cur.delete(code);
      else cur.add(code);
      return { ...prev, [id]: cur };
    });

  const allChecked = (item: CargaCliente) =>
    (item.productos ?? []).every((p) => checkedItems[item.rutaDetalleId]?.has(p.codigoProducto));

  const handleConfirm = async (item: CargaCliente) => {
    try {
      setConfirming(item.rutaDetalleId);
      setError("");
      const items: ItemCargaConfirmacion[] = (item.productos ?? []).map((p) => ({
        codigoProducto: p.codigoProducto,
        cantidadCargada: itemQtys[item.rutaDetalleId]?.[p.codigoProducto] ?? p.cantidad,
      }));
      const response = await entregaService.confirmarCarga(numericRutaId, item.rutaDetalleId, items);
      setData((prev) =>
        prev
          ? { ...prev, clientes: prev.clientes.map((c) => (c.rutaDetalleId === item.rutaDetalleId ? { ...c, confirmado: true } : c)) }
          : prev
      );
      setExpandedId(null);
      if (response.rutaDespachada) {
        setSuccess(t("entrega.routeDispatched"));
        setTimeout(() => router.back(), 900);
      } else {
        setSuccess(t("entrega.clientLoaded"));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t("entrega.errorConfirmingLoad"));
    } finally {
      setConfirming(null);
    }
  };

  const sorted = [...(data?.clientes ?? [])].sort((a, b) => b.secuenciaEntrega - a.secuenciaEntrega);
  const totalC = sorted.length;
  const loadedC = sorted.filter((c) => c.confirmado).length;
  const allLoaded = totalC > 0 && loadedC === totalC;

  const renderCard = ({ item }: { item: CargaCliente }) => {
    const isConfirming = confirming === item.rutaDetalleId;
    const isExpanded = expandedId === item.rutaDetalleId;
    const productos = item.productos ?? [];
    return (
      <Card
        style={[
          styles.card,
          { backgroundColor: theme.colors.surface, borderLeftColor: item.confirmado ? "#388E3C" : theme.colors.primary, opacity: item.confirmado ? 0.7 : 1 },
        ]}
      >
        <Pressable onPress={() => !item.confirmado && setExpandedId((p) => (p === item.rutaDetalleId ? null : item.rutaDetalleId))}>
          <Card.Content>
            <View style={styles.header}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text variant="titleMedium" style={{ fontWeight: "bold", color: theme.colors.onSurface }} numberOfLines={1}>
                  {item.nombreCliente}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{item.codigoCliente}</Text>
              </View>
              <Chip
                compact
                icon={item.confirmado ? "check" : "clock-outline"}
                style={{ backgroundColor: item.confirmado ? "#E8F5E9" : "#FFF3E0" }}
                textStyle={{ color: item.confirmado ? "#388E3C" : "#F57C00", fontSize: 11 }}
              >
                {item.confirmado ? t("entrega.loaded") : t("entrega.pending")}
              </Chip>
            </View>
            <View style={styles.deliveryRow}>
              <Icon source="truck-delivery" size={16} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 6 }}>
                #{item.secuenciaEntrega} · {productos.length} {t("entrega.items")}
              </Text>
              {!item.confirmado && <Icon source={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={theme.colors.onSurfaceVariant} />}
            </View>
          </Card.Content>
        </Pressable>

        {isExpanded && !item.confirmado && (
          <Card.Content style={{ paddingTop: 0 }}>
            <Divider style={{ marginVertical: 10 }} />
            {productos.map((prod, idx) => {
              const checked = checkedItems[item.rutaDetalleId]?.has(prod.codigoProducto) ?? false;
              const qty = itemQtys[item.rutaDetalleId]?.[prod.codigoProducto] ?? prod.cantidad;
              return (
                <View key={`${prod.codigoProducto}-${idx}`} style={styles.itemRow}>
                  <Checkbox status={checked ? "checked" : "unchecked"} onPress={() => toggleItem(item.rutaDetalleId, prod.codigoProducto)} color={theme.colors.primary} />
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }} numberOfLines={1}>{prod.descripcion}</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{prod.codigoProducto} · {prod.unidad}</Text>
                  </View>
                  <View style={styles.stepper}>
                    <IconButton icon="minus" size={18} onPress={() => setQty(item.rutaDetalleId, prod.codigoProducto, qty - 1)} style={styles.stepperBtn} />
                    <TextInput value={String(qty)} onChangeText={(v) => { const n = parseInt(v, 10); if (!isNaN(n)) setQty(item.rutaDetalleId, prod.codigoProducto, n); }} keyboardType="numeric" style={styles.stepperInput} dense mode="outlined" />
                    <IconButton icon="plus" size={18} onPress={() => setQty(item.rutaDetalleId, prod.codigoProducto, qty + 1)} style={styles.stepperBtn} />
                  </View>
                </View>
              );
            })}
            <Button mode="contained" onPress={() => handleConfirm(item)} disabled={isConfirming || !allChecked(item)} loading={isConfirming} icon="truck-check" style={{ marginTop: 12, minHeight: 48 }}>
              {t("entrega.confirmLoad")}
            </Button>
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
      <View style={[styles.progress, { backgroundColor: theme.colors.surface }]}>
        <Text variant="bodyLarge" style={{ fontWeight: "bold", color: allLoaded ? "#388E3C" : theme.colors.onSurface, marginBottom: 8 }}>
          {allLoaded ? `✅ ${t("entrega.allLoaded")}` : t("entrega.loadProgress", { loaded: loadedC, total: totalC })}
        </Text>
        <ProgressBar progress={totalC > 0 ? loadedC / totalC : 0} color={allLoaded ? "#388E3C" : theme.colors.primary} style={{ height: 10, borderRadius: 5 }} />
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(item) => String(item.rutaDetalleId)}
        renderItem={renderCard}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      />

      <Snackbar visible={!!error} onDismiss={() => setError("")} duration={4000} action={{ label: t("common.retry"), onPress: () => { setError(""); loadCarga(); } }}>{error}</Snackbar>
      <Snackbar visible={!!success} onDismiss={() => setSuccess("")} duration={2000}>{success}</Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  progress: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#E0E0E0" },
  card: { borderRadius: 12, borderLeftWidth: 4, elevation: 2 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  deliveryRow: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 4 },
  itemRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4, minHeight: 52 },
  stepper: { flexDirection: "row", alignItems: "center" },
  stepperBtn: { margin: 0, width: 32, height: 32 },
  stepperInput: { width: 56, height: 36, textAlign: "center", fontSize: 14, paddingHorizontal: 2 },
});
