import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Image, Linking, ScrollView, StyleSheet, View } from "react-native";
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
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useTranslation } from "@/hooks/useTranslation";
import { entregaService } from "../../../../services/entregaService";
import {
  EntregaFacturaDetalle,
  ItemFaltanteRequest,
  RegistrarEntregaRequest,
} from "../../../../types/entrega";
import { getCurrentCoords } from "../../../../utils/deliveryLocation";
import { uploadDeliveryPhoto } from "../../../../utils/deliveryPhoto";
import { hasCoords, mapProviderOptions, openInMaps } from "../../../../utils/mapLinks";

type Outcome = "entregado" | "no_entregado" | "parcial";

const PAYMENT_TYPES = ["efectivo", "cheque", "transferencia", "credito"] as const;
const PAID_TO_TRUCK = ["efectivo", "cheque", "transferencia"];

export default function FacturaEntregaScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { rutaId, noPedidoStr } = useLocalSearchParams<{ rutaId: string; noPedidoStr: string }>();
  const numericRutaId = parseInt(rutaId ?? "0", 10);

  const [data, setData] = useState<EntregaFacturaDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [showMap, setShowMap] = useState(false);
  const [showReason, setShowReason] = useState(false);
  const [reason, setReason] = useState("");
  const [partialMode, setPartialMode] = useState(false);
  const [faltantes, setFaltantes] = useState<Record<string, number>>({});

  // Delivery confirmation form (payment + proof photo).
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [tipoPago, setTipoPago] = useState<string>("efectivo");
  const [monto, setMonto] = useState("");
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const load = useCallback(async () => {
    try {
      setError("");
      const res = await entregaService.getFactura(numericRutaId, noPedidoStr ?? "");
      setData(res);
      // Pre-fill the partial delivery from the shortage reported when the truck was loaded.
      if (res.faltantesCarga?.length) {
        setFaltantes(
          Object.fromEntries(res.faltantesCarga.map((f) => [f.codigoProducto, f.cantidadFaltante]))
        );
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || t("entrega.errorLoading"));
    } finally {
      setLoading(false);
    }
  }, [numericRutaId, noPedidoStr, t]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (status: Outcome, extra?: Partial<RegistrarEntregaRequest>) => {
    if (!data) return;
    try {
      setSubmitting(true);
      setError("");
      const coords = await getCurrentCoords();
      const payload: RegistrarEntregaRequest = {
        status,
        latitud: coords?.latitud,
        longitud: coords?.longitud,
        idempotencyKey: `${data.noPedidoStr}-${Date.now()}`,
        ...extra,
      };
      await entregaService.registrarEntrega(numericRutaId, data.noPedidoStr, payload);
      router.back();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || t("entrega.errorDelivering"));
    } finally {
      setSubmitting(false);
    }
  };

  const submitPartial = () => {
    const items: ItemFaltanteRequest[] = Object.entries(faltantes)
      .filter(([, q]) => q > 0)
      .map(([codigoProducto, cantidadFaltante]) => ({ codigoProducto, cantidadFaltante }));
    if (items.length === 0) {
      setError(t("entrega.partialNeedsItems"));
      return;
    }
    submit("parcial", { itemsFaltantes: items });
  };

  const setFaltante = (code: string, qty: number, max: number) =>
    setFaltantes((prev) => ({ ...prev, [code]: Math.min(max, Math.max(0, qty)) }));

  const takePhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setError(t("entrega.cameraPermission"));
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.5 });
      if (result.canceled || !result.assets?.length) return;
      const uri = result.assets[0].uri;
      setFotoUri(uri);
      setUploadingPhoto(true);
      try {
        const url = await uploadDeliveryPhoto(data?.noPedidoStr ?? noPedidoStr ?? "doc", uri);
        setFotoUrl(url);
      } catch {
        setError(t("entrega.photoUploadError"));
      } finally {
        setUploadingPhoto(false);
      }
    } catch {
      setError(t("entrega.photoUploadError"));
    }
  };

  const confirmDelivery = () => {
    const paidToTruck = PAID_TO_TRUCK.includes(tipoPago);
    const montoNum = parseFloat(monto);
    setDeliverOpen(false);
    submit("entregado", {
      tipoPago,
      montoRecibido: paidToTruck && !isNaN(montoNum) ? montoNum : undefined,
      fotoUrl: fotoUrl ?? undefined,
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: theme.colors.background }]} edges={["left", "right"]}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: theme.colors.background }]} edges={["left", "right"]}>
        <Text>{error || t("entrega.errorLoading")}</Text>
      </SafeAreaView>
    );
  }

  const canNavigate = hasCoords(data);
  const alreadyRecorded = data.entrega && data.statusDetalle !== "activo";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={["left", "right"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Customer */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={styles.custHeader}>
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={{ fontWeight: "bold", color: theme.colors.onSurface }}>
                  {data.nombreCliente || data.codigoCliente}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {data.codigoCliente} · {data.noFactura || data.noPedidoStr}
                </Text>
              </View>
              <IconButton
                icon="map-marker"
                mode="contained-tonal"
                disabled={!canNavigate}
                onPress={() => setShowMap(true)}
              />
            </View>
            {!!data.direccion && (
              <View style={styles.infoRow}>
                <Icon source="home-map-marker" size={16} color={theme.colors.onSurfaceVariant} />
                <Text variant="bodySmall" style={styles.infoText}>{data.direccion}</Text>
              </View>
            )}
            {!!data.referenciaDireccion && (
              <View style={styles.infoRow}>
                <Icon source="sign-direction" size={16} color={theme.colors.onSurfaceVariant} />
                <Text variant="bodySmall" style={styles.infoText}>{data.referenciaDireccion}</Text>
              </View>
            )}
            {!!data.telefono && (
              <View style={styles.infoRow}>
                <Icon source="phone" size={16} color={theme.colors.onSurfaceVariant} />
                <Text
                  variant="bodySmall"
                  style={[styles.infoText, { color: theme.colors.primary }]}
                  onPress={() => Linking.openURL(`tel:${data.telefono}`)}
                >
                  {data.telefono}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {alreadyRecorded && (
          <Chip icon="information" style={styles.recordedChip} textStyle={{ fontSize: 12 }}>
            {t("entrega.alreadyRecorded", { status: t(`entrega.detalle.${data.statusDetalle}`) })}
          </Chip>
        )}

        {(data.faltantesCarga?.length ?? 0) > 0 && (
          <Chip icon="alert-circle-outline" style={styles.issueChip} textStyle={{ fontSize: 12, color: "#B26A00" }}>
            {t("entrega.loadShortageBanner", { count: data.faltantesCarga.length })}
          </Chip>
        )}

        {/* Lines */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text variant="titleSmall" style={{ fontWeight: "bold", marginBottom: 8, color: theme.colors.onSurface }}>
              {t("entrega.items")} ({data.lineas.length})
            </Text>
            <Divider />
            {data.lineas.map((l, idx) => {
              const max = l.cantidad;
              const faltante = faltantes[l.codigoProducto] ?? 0;
              return (
                <View key={`${l.codigoProducto}-${idx}`} style={styles.lineRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }} numberOfLines={2}>
                      {l.descripcion || l.codigoProducto}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {l.codigoProducto} · {l.cantidad} {l.unidad ?? ""}
                    </Text>
                  </View>
                  {partialMode ? (
                    <View style={styles.stepper}>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginRight: 4 }}>
                        {t("entrega.missing")}
                      </Text>
                      <IconButton icon="minus" size={16} onPress={() => setFaltante(l.codigoProducto, faltante - 1, max)} style={styles.stepBtn} />
                      <TextInput
                        value={String(faltante)}
                        onChangeText={(v) => { const n = parseInt(v, 10); if (!isNaN(n)) setFaltante(l.codigoProducto, n, max); }}
                        keyboardType="numeric"
                        style={styles.stepInput}
                        dense
                        mode="outlined"
                      />
                      <IconButton icon="plus" size={16} onPress={() => setFaltante(l.codigoProducto, faltante + 1, max)} style={styles.stepBtn} />
                    </View>
                  ) : (
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                      {l.subTotal.toFixed(2)}
                    </Text>
                  )}
                </View>
              );
            })}
            <Divider style={{ marginTop: 8 }} />
            <View style={styles.totalRow}>
              <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant }}>{t("entrega.total")}</Text>
              <Text variant="titleMedium" style={{ fontWeight: "bold", color: theme.colors.onSurface }}>
                {data.total.toFixed(2)}
              </Text>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Actions */}
      <View style={[styles.actions, { backgroundColor: theme.colors.surface }]}>
        {partialMode ? (
          <>
            <Button mode="contained" buttonColor="#B26A00" icon="check" loading={submitting} disabled={submitting} onPress={submitPartial} contentStyle={{ minHeight: 48 }}>
              {t("entrega.confirmPartial")}
            </Button>
            <Button mode="text" onPress={() => { setPartialMode(false); setFaltantes({}); }} disabled={submitting}>
              {t("common.cancel")}
            </Button>
          </>
        ) : (
          <View style={styles.actionRow}>
            <Button mode="contained" buttonColor="#2E7D32" icon="check-circle" style={styles.actionBtn} loading={submitting} disabled={submitting} onPress={() => setDeliverOpen(true)}>
              {t("entrega.deliver")}
            </Button>
            <Button mode="contained-tonal" icon="alert-circle-outline" style={styles.actionBtn} disabled={submitting} onPress={() => setPartialMode(true)}>
              {t("entrega.partial")}
            </Button>
            <Button mode="outlined" textColor="#C62828" icon="close-circle-outline" style={styles.actionBtn} disabled={submitting} onPress={() => setShowReason(true)}>
              {t("entrega.notDelivered")}
            </Button>
          </View>
        )}
      </View>

      {/* Delivery confirmation: payment + proof photo */}
      <Portal>
        <Dialog visible={deliverOpen} onDismiss={() => !submitting && setDeliverOpen(false)}>
          <Dialog.Title>{t("entrega.deliverTitle")}</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView contentContainerStyle={{ paddingVertical: 8, paddingHorizontal: 4 }}>
              <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
                {t("entrega.paymentType")}
              </Text>
              <View style={styles.payRow}>
                {PAYMENT_TYPES.map((tp) => (
                  <Chip
                    key={tp}
                    selected={tipoPago === tp}
                    showSelectedCheck
                    onPress={() => setTipoPago(tp)}
                    style={styles.payChip}
                  >
                    {t(`entrega.pay_${tp}`)}
                  </Chip>
                ))}
              </View>

              {PAID_TO_TRUCK.includes(tipoPago) && (
                <TextInput
                  mode="outlined"
                  label={t("entrega.amountReceived")}
                  value={monto}
                  onChangeText={setMonto}
                  keyboardType="decimal-pad"
                  left={<TextInput.Affix text="$" />}
                  style={{ marginTop: 12 }}
                />
              )}

              <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16, marginBottom: 8 }}>
                {t("entrega.photoProof")}
              </Text>
              {fotoUri ? (
                <View style={styles.photoWrap}>
                  <Image source={{ uri: fotoUri }} style={styles.photo} />
                  {uploadingPhoto ? (
                    <View style={styles.photoOverlay}>
                      <ActivityIndicator color="#FFF" />
                      <Text style={{ color: "#FFF", marginTop: 4 }}>{t("entrega.uploadingPhoto")}</Text>
                    </View>
                  ) : (
                    fotoUrl && (
                      <View style={styles.photoBadge}>
                        <Icon source="check-circle" size={22} color="#2E7D32" />
                      </View>
                    )
                  )}
                </View>
              ) : null}
              <Button mode="outlined" icon="camera" onPress={takePhoto} disabled={uploadingPhoto || submitting} style={{ marginTop: 8 }}>
                {fotoUri ? t("entrega.retakePhoto") : t("entrega.takePhoto")}
              </Button>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setDeliverOpen(false)} disabled={submitting}>{t("common.cancel")}</Button>
            <Button
              mode="contained"
              buttonColor="#2E7D32"
              loading={submitting}
              disabled={submitting || uploadingPhoto}
              onPress={confirmDelivery}
            >
              {t("entrega.confirmDelivery")}
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={showMap} onDismiss={() => setShowMap(false)}>
          <Dialog.Title>{t("entrega.openIn")}</Dialog.Title>
          <Dialog.Content>
            {mapProviderOptions().map((opt) => (
              <Button
                key={opt.provider}
                icon={opt.icon}
                mode="text"
                style={{ justifyContent: "flex-start", marginVertical: 2 }}
                contentStyle={{ justifyContent: "flex-start" }}
                onPress={async () => {
                  setShowMap(false);
                  await openInMaps(opt.provider, { latitud: data.latitud, longitud: data.longitud, label: data.nombreCliente });
                }}
              >
                {opt.label}
              </Button>
            ))}
          </Dialog.Content>
        </Dialog>

        {/* Not-delivered reason */}
        <Dialog visible={showReason} onDismiss={() => setShowReason(false)}>
          <Dialog.Title>{t("entrega.notDeliveredReason")}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              value={reason}
              onChangeText={setReason}
              placeholder={t("entrega.reasonPlaceholder")}
              multiline
              numberOfLines={3}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowReason(false)}>{t("common.cancel")}</Button>
            <Button
              loading={submitting}
              disabled={submitting}
              onPress={() => { setShowReason(false); submit("no_entregado", { observacion: reason || undefined }); }}
            >
              {t("common.confirm")}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={!!error} onDismiss={() => setError("")} duration={4000}>{error}</Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, paddingBottom: 24 },
  card: { borderRadius: 12, elevation: 2, marginBottom: 12 },
  custHeader: { flexDirection: "row", alignItems: "center" },
  infoRow: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 6 },
  infoText: { flex: 1, color: "#666" },
  recordedChip: { alignSelf: "flex-start", marginBottom: 12, backgroundColor: "#E3F2FD" },
  issueChip: { alignSelf: "flex-start", marginBottom: 12, backgroundColor: "#FFF4E5" },
  lineRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, minHeight: 48 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  stepper: { flexDirection: "row", alignItems: "center" },
  stepBtn: { margin: 0, width: 30, height: 30 },
  stepInput: { width: 52, height: 34, textAlign: "center", fontSize: 14, paddingHorizontal: 2 },
  actions: { padding: 12, borderTopWidth: 1, borderTopColor: "#E0E0E0" },
  actionRow: { flexDirection: "row", gap: 8 },
  payRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  payChip: { marginBottom: 4 },
  photoWrap: { alignSelf: "flex-start", position: "relative" },
  photo: { width: 120, height: 120, borderRadius: 8, backgroundColor: "#EEE" },
  photoOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoBadge: { position: "absolute", top: 4, right: 4, backgroundColor: "#FFF", borderRadius: 11 },
  actionBtn: { flex: 1 },
});
