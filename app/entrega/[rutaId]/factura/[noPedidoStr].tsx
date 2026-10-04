import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Appbar,
  Chip,
  Dialog,
  Icon,
  IconButton,
  Portal,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

import { gutterFor, type CustomTheme } from "@/constants/Theme";
import { useTranslation } from "@/hooks/useTranslation";
import { EntregaHeader } from "../../../../components/entrega/EntregaHeader";
import { useBackToRoute } from "../../../../components/entrega/useBackToRoute";
import EmptyState from "../../../../components/ui/EmptyState";
import FullScreenModal from "../../../../components/ui/FullScreenModal";
import GradientButton from "../../../../components/ui/GradientButton";
import { detalleStatusOf } from "../../../../components/entrega/detalleStatus";
import StatusChip from "../../../../components/ui/StatusChip";
import { entregaService } from "../../../../services/entregaService";
import { inventoryService } from "../../../../services/inventoryService";
import {
  EntregaFacturaDetalle,
  ItemFaltanteRequest,
  RegistrarEntregaRequest,
} from "../../../../types/entrega";
import { getCurrentCoords } from "../../../../utils/deliveryLocation";
import { formatDateTime, formatMoney } from "../../../../utils/documentFormat";
import {
  EFECTIVO,
  estadoCobro,
  loCobraElChofer,
  metodoInicial,
  metodosDisponibles,
  montoAdeudado,
  puedeConfirmarCobro,
} from "../../../../utils/deliveryPayment";
import { huellaEnvio, nuevaClaveIntento } from "../../../../utils/entregaAttempts";
import { uploadDeliveryPhoto } from "../../../../utils/deliveryPhoto";
import { capturePhoto, PhotoPermissionError } from "../../../../utils/photoCapture";
import { hasCoords, mapProviderOptions, openInMaps } from "../../../../utils/mapLinks";
import AppButton from "../../../../components/ui/AppButton";

type Outcome =
  | "entregado"
  | "entregado_con_novedad"
  | "no_entregado"
  | "parcial"
  | "entregar_despues";


export default function FacturaEntregaScreen() {
  const theme = useTheme() as CustomTheme;
  const { width } = useWindowDimensions();
  const gutter = gutterFor(width);
  const styles = useMemo(() => createStyles(theme, gutter), [theme, gutter]);
  const { status, colors } = theme.custom;
  // Android draws edge to edge: the system navigation bar overlaps the bottom of the screen.
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { rutaId, noPedidoStr } = useLocalSearchParams<{ rutaId: string; noPedidoStr: string }>();
  const backToRoute = useBackToRoute(rutaId);
  const numericRutaId = parseInt(rutaId ?? "0", 10);

  const [data, setData] = useState<EntregaFacturaDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [showMap, setShowMap] = useState(false);
  // Shared reason dialog for the two "not delivered today" outcomes.
  const [showReason, setShowReason] = useState(false);
  const [reasonOutcome, setReasonOutcome] = useState<"no_entregado" | "entregar_despues">("no_entregado");
  const [reason, setReason] = useState("");
  const [partialMode, setPartialMode] = useState(false);
  const [faltantes, setFaltantes] = useState<Record<string, number>>({});

  // Delivery confirmation form (payment + proof photo). issueMode = "delivered with issue".
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [issueMode, setIssueMode] = useState(false);
  const [issueNote, setIssueNote] = useState("");
  const [tipoPago, setTipoPago] = useState<string>(EFECTIVO);
  const [monto, setMonto] = useState("");
  // The payment dialog also closes a partial delivery: what is due is then the delivered part.
  const [partialPayment, setPartialPayment] = useState(false);
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  // A stop that already has an outcome: the next tap records a NEW attempt, so ask first.
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  // Idempotency key of the last submission: retrying the SAME submission (same outcome, payment, note,
  // photo, items) after a failed request reuses it, so the server recognises the replay; a corrected
  // submission or a new visit gets a new key and is recorded as a new attempt.
  const claveRef = useRef<{ huella: string; key: string } | null>(null);

  // keepForm: refresh the stop (e.g. after a failed submit) without overwriting what the driver typed.
  const load = useCallback(async (keepForm = false) => {
    try {
      setError("");
      const res = await entregaService.getFactura(numericRutaId, noPedidoStr ?? "");
      setData(res);
      // Pre-fill the partial delivery from the shortage reported when the truck was loaded.
      if (!keepForm && res.faltantesCarga?.length) {
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

  // ── Payment on delivery, per the invoice's payment condition ──
  const condicion = data?.condicionPago;
  const metodos = metodosDisponibles(condicion);
  const adeudado = data ? montoAdeudado(data.total, data.lineas, partialPayment ? faltantes : {}) : 0;
  const cobro = estadoCobro(tipoPago, adeudado, monto);
  const cobroValido = puedeConfirmarCobro(condicion, tipoPago, cobro);

  const submit = async (status: Outcome, extra?: Partial<RegistrarEntregaRequest>) => {
    if (!data) return;
    try {
      setSubmitting(true);
      setError("");
      const [coords, device] = await Promise.all([getCurrentCoords(), inventoryService.getDeviceInfo()]);
      const huella = huellaEnvio({ status, ...extra });
      const key = claveRef.current?.huella === huella ? claveRef.current.key : nuevaClaveIntento(data.noPedidoStr);
      claveRef.current = { huella, key };
      const payload: RegistrarEntregaRequest = {
        status,
        latitud: coords?.latitud,
        longitud: coords?.longitud,
        idempotencyKey: key,
        dispositivoId: device.id,
        ...extra,
      };
      await entregaService.registrarEntrega(numericRutaId, data.noPedidoStr, payload);
      router.back();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || t("entrega.errorDelivering"));
      // The request may have been recorded even though it failed here (lost response): refresh so the
      // next action sees the stop's real outcome and asks before recording another attempt.
      load(true);
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
    // Collect for the delivered part before saving — the same payment step as a full delivery.
    openDeliverDialog(false, true);
  };

  const setFaltante = (code: string, qty: number, max: number) =>
    setFaltantes((prev) => ({ ...prev, [code]: Math.min(max, Math.max(0, qty)) }));

  const takePhoto = async () => {
    try {
      const foto = await capturePhoto("camera", { quality: 0.5 });
      if (!foto) return;
      const uri = foto.uri;
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
    } catch (e) {
      setError(
        e instanceof PhotoPermissionError ? t("entrega.cameraPermission") : t("entrega.photoUploadError")
      );
    }
  };

  const confirmDelivery = () => {
    if (issueMode && !issueNote.trim()) {
      setError(t("entrega.issueNoteRequired"));
      return;
    }
    if (!cobroValido) return;
    const cobrado = loCobraElChofer(tipoPago);
    setDeliverOpen(false);
    submit(partialPayment ? "parcial" : issueMode ? "entregado_con_novedad" : "entregado", {
      tipoPago: tipoPago || undefined,
      montoCobrado: cobrado ? adeudado : undefined,
      // Cash can exceed what is due; the server stores the change for audit.
      montoRecibido: cobrado ? (cobro.tipo === "ok" ? cobro.recibido : adeudado) : undefined,
      fotoUrl: fotoUrl ?? undefined,
      observacion: issueMode ? issueNote.trim() : undefined,
      itemsFaltantes: partialPayment
        ? Object.entries(faltantes)
            .filter(([, q]) => q > 0)
            .map(([codigoProducto, cantidadFaltante]) => ({ codigoProducto, cantidadFaltante }))
        : undefined,
    });
  };

  // Open the delivery dialog with a clean form so payment/photo/note from a previous (cancelled)
  // attempt never leak into the next submission.
  const openDeliverDialog = (issue: boolean, partial = false) => {
    setIssueMode(issue);
    setPartialPayment(partial);
    setIssueNote("");
    setTipoPago(metodoInicial(metodos));
    setMonto("");
    setFotoUri(null);
    setFotoUrl(null);
    setDeliverOpen(true);
  };


  const header = (
    <EntregaHeader title={t("entrega.deliveryDetailTitle")} onBack={backToRoute}>
      {!!data && (
        <Appbar.Action
          icon="map-marker-outline"
          color={colors.tint}
          disabled={!hasCoords(data)}
          onPress={() => setShowMap(true)}
          accessibilityLabel={t("entrega.ui.openMap")}
        />
      )}
    </EntregaHeader>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        {header}
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        {header}
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

  const alreadyRecorded = data.entrega && data.statusDetalle !== "activo";
  const intentosPrevios = data.intentosPrevios ?? [];
  // Every outcome button goes through here: on a stop that already has an outcome it asks before
  // recording a new attempt (append-only — the earlier attempt stays in the history).
  const withNewAttemptCheck = (action: () => void) => () =>
    alreadyRecorded ? setPendingAction(() => action) : action();

  const st = detalleStatusOf(data.statusDetalle);
  const docNo = data.noFactura || data.noPedidoStr;
  const detailRows: { label: string; value: string; icon: string; onPress?: () => void }[] = [
    { label: t("entrega.ui.customerCode"), value: data.codigoCliente, icon: "account-outline" },
    ...(data.direccion ? [{ label: t("entrega.ui.address"), value: data.direccion, icon: "home-map-marker" }] : []),
    ...(data.referenciaDireccion
      ? [{ label: t("entrega.ui.reference"), value: data.referenciaDireccion, icon: "sign-direction" }]
      : []),
    ...(data.ventanasEntrega?.length
      ? [{
          label: t("entrega.ui.window"),
          // Each window on its own line, with its note ("tocar por la puerta lateral") under it.
          value: data.ventanasEntrega
            .map((v) => `${v.horaInicio} – ${v.horaFin}${v.observacion ? `\n${v.observacion}` : ""}`)
            .join("\n"),
          icon: "clock-outline",
        }]
      : []),
    ...(data.telefono
      ? [{ label: t("entrega.ui.phone"), value: data.telefono, icon: "phone-outline", onPress: () => Linking.openURL(`tel:${data.telefono}`) }]
      : []),
  ];
  // Outcomes other than a clean delivery, as quiet quick actions under the lines: the clean
  // delivery is the one the driver records most, so it alone gets the pinned CTA.
  const otherOutcomes: { key: string; label: string; icon: string; color: string; onPress: () => void }[] = [
    { key: "issue", label: t("entrega.deliverWithIssue"), icon: "check-decagram-outline", color: colors.tint, onPress: withNewAttemptCheck(() => openDeliverDialog(true)) },
    { key: "partial", label: t("entrega.partial"), icon: "package-variant", color: colors.tint, onPress: withNewAttemptCheck(() => setPartialMode(true)) },
    { key: "later", label: t("entrega.deliverLater"), icon: "calendar-clock", color: colors.tint, onPress: withNewAttemptCheck(() => { setReasonOutcome("entregar_despues"); setReason(""); setShowReason(true); }) },
    { key: "notDelivered", label: t("entrega.notDelivered"), icon: "close-circle-outline", color: status.negative.base, onPress: withNewAttemptCheck(() => { setReasonOutcome("no_entregado"); setReason(""); setShowReason(true); }) },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {header}
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Text style={styles.overline}>{t("entrega.invoiceLabel")} · {docNo}</Text>
          <Text style={styles.largeTitle}>{data.nombreCliente || data.codigoCliente}</Text>
          <View style={styles.heroChips}>
            <StatusChip label={t(st.key)} tone={st.tone} />
            {!!condicion?.contraEntrega && <StatusChip label={t("entrega.cobro.codBadge")} tone="warning" />}
          </View>
        </View>

        {alreadyRecorded && (
          <View style={[styles.strip, { backgroundColor: status.info.container }]}>
            <Icon source="information-outline" size={20} color={status.info.onContainer} />
            <Text style={[styles.stripText, { color: status.info.onContainer }]}>
              {t("entrega.alreadyRecorded", { status: t(`entrega.detalle.${data.statusDetalle}`) })}
            </Text>
          </View>
        )}

        {(data.faltantesCarga?.length ?? 0) > 0 && (
          <View style={[styles.strip, { backgroundColor: colors.warningBackground }]}>
            <Icon source="alert-circle-outline" size={20} color={colors.warningForeground} />
            <Text style={[styles.stripText, { color: colors.warningForeground }]}>
              {t("entrega.loadShortageBanner", { count: data.faltantesCarga.length })}
            </Text>
          </View>
        )}

        {/* Customer */}
        <Text style={[styles.overline, styles.sectionHeader]}>{t("entrega.ui.customerOverline")}</Text>
        {detailRows.map((row) => {
          const content = (
            <>
              <Icon source={row.icon} size={20} color={row.onPress ? colors.tint : colors.inkTertiary} />
              <Text style={styles.detailLabel}>{row.label}</Text>
              <Text style={[styles.detailValue, row.onPress && styles.detailLink]}>{row.value}</Text>
            </>
          );
          return row.onPress ? (
            <Pressable
              key={row.label}
              onPress={row.onPress}
              style={({ pressed }) => [styles.detailRow, pressed && styles.pressed]}
              accessibilityRole="link"
              accessibilityLabel={`${row.label}: ${row.value}`}
            >
              {content}
            </Pressable>
          ) : (
            <View key={row.label} style={styles.detailRow} accessible accessibilityLabel={`${row.label}: ${row.value}`}>
              {content}
            </View>
          );
        })}

        {intentosPrevios.length > 0 && (
          <>
            <Text style={[styles.overline, styles.sectionHeader]}>
              {t("entrega.intentosPrevios")} · {intentosPrevios.length}
            </Text>
            {intentosPrevios.map((i) => {
              const ist = detalleStatusOf(i.status);
              const titulo = `${t("entrega.intentoN", { n: i.intento })} · ${t(`entrega.detalle.${i.status}`)}`;
              const detalle = [formatDateTime(i.fecha), i.noRuta ? t("entrega.intentoRuta", { ruta: i.noRuta }) : null, i.chofer]
                .filter(Boolean)
                .join(" · ");
              const nota = i.observacion || i.codigoMotivoRechazo;
              return (
                <View
                  key={`${i.intento}-${i.fecha}`}
                  style={styles.attemptRow}
                  accessible
                  accessibilityLabel={[titulo, detalle, nota].filter(Boolean).join(", ")}
                >
                  <View style={styles.flex}>
                    <Text style={styles.attemptTitle}>{t("entrega.intentoN", { n: i.intento })}</Text>
                    <Text style={styles.attemptDetail}>{detalle}</Text>
                    {!!nota && <Text style={styles.attemptNote}>{nota}</Text>}
                  </View>
                  <StatusChip label={t(ist.key)} tone={ist.tone} />
                </View>
              );
            })}
          </>
        )}

        {/* Lines */}
        <Text style={[styles.overline, styles.sectionHeader]}>
          {partialMode ? t("entrega.ui.partialOverline") : `${t("entrega.items")} · ${data.lineas.length}`}
        </Text>
        {data.lineas.map((l, idx) => {
          const max = l.cantidad;
          const faltante = faltantes[l.codigoProducto] ?? 0;
          return (
            <View key={`${l.codigoProducto}-${idx}`} style={styles.lineRow}>
              <View style={styles.lineTop}>
                <View style={styles.flex}>
                  <Text style={styles.lineName} numberOfLines={2}>
                    {l.descripcion || l.codigoProducto}
                  </Text>
                  <Text style={styles.lineMeta}>
                    {l.codigoProducto} · {l.cantidad} {l.unidad ?? ""}
                  </Text>
                </View>
                {!partialMode && (
                  <Text style={styles.lineAmount} numberOfLines={1}>
                    {formatMoney(l.subTotal)}
                  </Text>
                )}
              </View>
              {partialMode && (
                <View style={styles.stepperRow}>
                  <Text style={styles.stepperLabel}>{t("entrega.missing")}</Text>
                  <View style={styles.stepper}>
                    <IconButton
                      icon="minus"
                      size={18}
                      iconColor={colors.tint}
                      onPress={() => setFaltante(l.codigoProducto, faltante - 1, max)}
                      style={styles.stepBtn}
                      accessibilityLabel={t("entrega.ui.decreaseMissing")}
                    />
                    <TextInput
                      value={String(faltante)}
                      onChangeText={(v) => { const n = parseInt(v, 10); if (!isNaN(n)) setFaltante(l.codigoProducto, n, max); }}
                      keyboardType="numeric"
                      style={styles.stepInput}
                      dense
                      mode="flat"
                      underlineColor="transparent"
                      accessibilityLabel={`${t("entrega.missing")}: ${l.descripcion || l.codigoProducto}`}
                    />
                    <IconButton
                      icon="plus"
                      size={18}
                      iconColor={colors.tint}
                      onPress={() => setFaltante(l.codigoProducto, faltante + 1, max)}
                      style={styles.stepBtn}
                      accessibilityLabel={t("entrega.ui.increaseMissing")}
                    />
                  </View>
                </View>
              )}
            </View>
          );
        })}

        {!partialMode && (
          <>
            <Text style={[styles.overline, styles.sectionHeader]}>{t("entrega.ui.otherOutcomes")}</Text>
            {otherOutcomes.map((o) => (
              <Pressable
                key={o.key}
                onPress={o.onPress}
                disabled={submitting}
                style={({ pressed }) => [styles.outcomeRow, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityState={{ disabled: submitting }}
              >
                <Icon source={o.icon} size={22} color={submitting ? colors.inkTertiary : o.color} />
                <Text style={[styles.outcomeLabel, { color: submitting ? colors.inkTertiary : o.color }]}>{o.label}</Text>
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>

      {/* Primary action */}
      <View style={[styles.footer, { paddingBottom: theme.custom.spacing.md + insets.bottom }]}>
        {partialMode ? (
          <>
            <Pressable
              onPress={() => { setPartialMode(false); setFaltantes({}); }}
              disabled={submitting}
              style={styles.footerCancel}
              accessibilityRole="button"
            >
              <Text style={[styles.outcomeLabel, { color: submitting ? colors.inkTertiary : colors.tint }]}>
                {t("common.cancel")}
              </Text>
            </Pressable>
            <GradientButton
              icon="check"
              label={t("entrega.confirmPartial")}
              loading={submitting}
              onPress={submitPartial}
              style={styles.flex}
            />
          </>
        ) : (
          <>
            <View style={styles.flex} accessible accessibilityLabel={`${t("entrega.total")}: ${formatMoney(data.total)}`}>
              <Text style={styles.overline}>{t("entrega.total")}</Text>
              <Text style={styles.footerTotal} numberOfLines={1} adjustsFontSizeToFit>
                {formatMoney(data.total)}
              </Text>
            </View>
            <GradientButton
              icon="check-circle-outline"
              label={t("entrega.deliver")}
              loading={submitting}
              onPress={withNewAttemptCheck(() => openDeliverDialog(false))}
            />
          </>
        )}
      </View>

      {/* Delivery confirmation: payment + proof photo */}
      <Portal>
        {/* A full-screen sheet rather than a Dialog: a Dialog stays centred under the number pad,
            which has no return key, so the driver could not reach Confirm. Here the footer rides
            above the keyboard. */}
        <FullScreenModal
          visible={deliverOpen}
          onDismiss={() => !submitting && setDeliverOpen(false)}
          dismissable={!submitting}
          style={styles.sheet}
        >
          <Appbar.Header mode="small" style={styles.sheetHeader}>
            <Appbar.Action
              icon="close"
              onPress={() => setDeliverOpen(false)}
              disabled={submitting}
              accessibilityLabel={t("common.close")}
            />
            <Appbar.Content
              title={issueMode ? t("entrega.deliverWithIssueTitle") : t("entrega.deliverTitle")}
            />
          </Appbar.Header>
          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView
              contentContainerStyle={styles.sheetScroll}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {issueMode && (
                <TextInput
                  mode="outlined"
                  label={t("entrega.issueNote")}
                  value={issueNote}
                  onChangeText={setIssueNote}
                  placeholder={t("entrega.issueNotePlaceholder")}
                  multiline
                  numberOfLines={2}
                  style={styles.dialogField}
                />
              )}
              <View style={styles.dueRow}>
                <Text style={styles.dialogOverline}>
                  {partialPayment ? t("entrega.cobro.duePartial") : t("entrega.cobro.due")}
                </Text>
                <Text style={styles.dueAmount}>{formatMoney(adeudado)}</Text>
              </View>
              {!!condicion?.contraEntrega && (
                <Text style={styles.codHint}>{t("entrega.cobro.codHint")}</Text>
              )}

              {metodos.length > 0 && (
                <>
                  <Text style={styles.dialogOverline}>{t("entrega.paymentType")}</Text>
                  <View style={styles.payRow}>
                    {metodos.map((tp) => (
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
                </>
              )}

              {tipoPago === EFECTIVO && (
                <>
                  <TextInput
                    mode="outlined"
                    label={t("entrega.amountReceived")}
                    value={monto}
                    onChangeText={setMonto}
                    keyboardType="decimal-pad"
                    left={<TextInput.Affix text="$" />}
                    error={cobro.tipo === "insuficiente"}
                    style={styles.amountField}
                  />
                  {cobro.tipo === "ok" && (
                    <View style={styles.changeRow} accessibilityLiveRegion="polite">
                      <Text style={styles.changeLabel}>{t("entrega.cobro.change")}</Text>
                      <Text style={[styles.changeAmount, { color: status.positive.base }]}>{formatMoney(cobro.cambio)}</Text>
                    </View>
                  )}
                  {cobro.tipo === "insuficiente" && (
                    <Text style={[styles.changeLabel, { color: status.negative.base }]} accessibilityLiveRegion="polite">
                      {t("entrega.cobro.short", { amount: formatMoney(cobro.falta) })}
                    </Text>
                  )}
                </>
              )}

              <Text style={[styles.dialogOverline, styles.photoOverline]}>{t("entrega.photoProof")}</Text>
              {fotoUri ? (
                <View style={styles.photoWrap}>
                  <Image source={{ uri: fotoUri }} style={styles.photo} />
                  {uploadingPhoto ? (
                    <View style={styles.photoOverlay}>
                      <ActivityIndicator color={colors.onGradient} />
                      <Text style={styles.photoOverlayText}>{t("entrega.uploadingPhoto")}</Text>
                    </View>
                  ) : (
                    fotoUrl && (
                      <View style={styles.photoBadge}>
                        <Icon source="check-circle" size={PHOTO_BADGE_SIZE} color={status.positive.base} />
                      </View>
                    )
                  )}
                </View>
              ) : null}
              <AppButton mode="outlined" icon="camera" onPress={takePhoto} disabled={uploadingPhoto || submitting} style={styles.photoButton}>
                {fotoUri ? t("entrega.retakePhoto") : t("entrega.takePhoto")}
              </AppButton>
            </ScrollView>
            <View style={[styles.footer, { paddingBottom: theme.custom.spacing.md + insets.bottom }]}>
              <Pressable
                onPress={() => setDeliverOpen(false)}
                disabled={submitting}
                style={styles.footerCancel}
                accessibilityRole="button"
              >
                <Text style={[styles.outcomeLabel, { color: submitting ? colors.inkTertiary : colors.tint }]}>
                  {t("common.cancel")}
                </Text>
              </Pressable>
              <GradientButton
                icon="check-circle-outline"
                label={partialPayment ? t("entrega.confirmPartial") : t("entrega.confirmDelivery")}
                loading={submitting}
                disabled={submitting || uploadingPhoto || !cobroValido}
                onPress={confirmDelivery}
                style={styles.flex}
              />
            </View>
          </KeyboardAvoidingView>
        </FullScreenModal>

        <Dialog visible={showMap} onDismiss={() => setShowMap(false)}>
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
                  setShowMap(false);
                  await openInMaps(opt.provider, { latitud: data.latitud, longitud: data.longitud, label: data.nombreCliente });
                }}
              >
                {opt.label}
              </AppButton>
            ))}
          </Dialog.Content>
        </Dialog>

        {/* A stop that already has an outcome: confirm before recording a new attempt */}
        <Dialog visible={!!pendingAction} onDismiss={() => setPendingAction(null)}>
          <Dialog.Title>{t("entrega.nuevoIntentoTitle")}</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogBody}>
              {t("entrega.nuevoIntentoBody", { status: t(`entrega.detalle.${data.statusDetalle}`) })}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <AppButton onPress={() => setPendingAction(null)}>{t("common.cancel")}</AppButton>
            <AppButton
              mode="contained"
              onPress={() => {
                const action = pendingAction;
                setPendingAction(null);
                action?.();
              }}
            >
              {t("entrega.nuevoIntentoConfirm")}
            </AppButton>
          </Dialog.Actions>
        </Dialog>

        {/* Reason for not-delivered / deliver-later */}
        <Dialog visible={showReason} onDismiss={() => setShowReason(false)}>
          <Dialog.Title>
            {reasonOutcome === "entregar_despues" ? t("entrega.deliverLaterReason") : t("entrega.notDeliveredReason")}
          </Dialog.Title>
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
            <AppButton onPress={() => setShowReason(false)}>{t("common.cancel")}</AppButton>
            <AppButton
              loading={submitting}
              disabled={submitting}
              onPress={() => { setShowReason(false); submit(reasonOutcome, { observacion: reason || undefined }); }}
            >
              {t("common.confirm")}
            </AppButton>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={!!error} onDismiss={() => setError("")} duration={4000}>{error}</Snackbar>
    </SafeAreaView>
  );
}

const PHOTO_BADGE_SIZE = 22;
const PHOTO_SIZE = 120;
const STEP_INPUT_WIDTH = 56;

const createStyles = (theme: CustomTheme, gutter: number) => {
  const { colors, radius, spacing, type, surface, hairline, touchTarget } = theme.custom;
  return StyleSheet.create({
    // Fills the screen and centres the empty or error state in it.
    stateView: { flex: 1 },
    container: { flex: 1, backgroundColor: colors.background },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
    flex: { flex: 1 },
    pressed: { backgroundColor: colors.fill },
    scroll: { paddingBottom: spacing.xxl },
    hero: { paddingHorizontal: gutter, paddingTop: spacing.sm, paddingBottom: spacing.lg, gap: spacing.sm },
    overline: { ...type.overline },
    largeTitle: { ...type.largeTitle },
    strip: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: gutter,
      paddingVertical: spacing.md,
      minHeight: touchTarget,
    },
    stripText: { ...type.bodySmall, flex: 1 },
    sectionHeader: {
      paddingHorizontal: gutter,
      paddingTop: spacing.xl,
      paddingBottom: spacing.sm,
      borderBottomWidth: hairline,
      borderBottomColor: colors.hairline,
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.md,
      paddingHorizontal: gutter,
      paddingVertical: spacing.md,
      minHeight: touchTarget,
      borderBottomWidth: hairline,
      borderBottomColor: colors.hairline,
    },
    detailLabel: { ...type.bodySmall, minWidth: "28%" },
    detailValue: { ...type.body, flex: 1, textAlign: "right" },
    detailLink: { color: colors.tint },
    attemptRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.md,
      paddingHorizontal: gutter,
      paddingVertical: spacing.md,
      minHeight: touchTarget,
      borderBottomWidth: hairline,
      borderBottomColor: colors.hairline,
    },
    attemptTitle: { ...type.rowTitle },
    attemptDetail: { ...type.bodySmall, color: colors.inkSecondary },
    attemptNote: { ...type.caption, marginTop: spacing.xs },
    lineRow: {
      paddingHorizontal: gutter,
      paddingVertical: spacing.md,
      minHeight: touchTarget,
      gap: spacing.sm,
      borderBottomWidth: hairline,
      borderBottomColor: colors.hairline,
    },
    lineTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    lineName: { ...type.body },
    lineMeta: { ...type.caption },
    lineAmount: { ...type.figure(17) },
    stepperRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: spacing.md },
    stepperLabel: { ...type.bodySmall },
    stepper: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.fill,
      borderRadius: radius.control,
    },
    stepBtn: { margin: 0, width: touchTarget, height: touchTarget },
    stepInput: {
      width: STEP_INPUT_WIDTH,
      height: touchTarget,
      textAlign: "center",
      backgroundColor: "transparent",
      ...type.figure(type.body.fontSize ?? 17),
      paddingHorizontal: 0,
    },
    outcomeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: gutter,
      minHeight: touchTarget + spacing.sm,
      borderBottomWidth: hairline,
      borderBottomColor: colors.hairline,
    },
    outcomeLabel: { ...type.body },
    footer: {
      ...surface.floating,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.lg,
      paddingHorizontal: gutter,
      paddingTop: spacing.md,
    },
    footerTotal: { ...type.figure(28) },
    footerCancel: { minHeight: touchTarget, justifyContent: "center" },
    sheet: { backgroundColor: colors.background },
    sheetHeader: { backgroundColor: colors.background },
    sheetScroll: { paddingHorizontal: gutter, paddingVertical: spacing.lg },
    dialogField: { marginBottom: spacing.md },
    dialogOverline: { ...type.overline, marginBottom: spacing.sm },
    dialogBody: { ...type.body },
    amountField: { marginTop: spacing.md },
    heroChips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    dueRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: spacing.sm },
    dueAmount: { ...type.figure(22) },
    codHint: { ...type.caption, color: colors.warningForeground, marginBottom: spacing.md },
    changeRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: spacing.sm },
    changeLabel: { ...type.bodySmall, marginTop: spacing.sm },
    changeAmount: { ...type.figure(20) },
    photoOverline: { marginTop: spacing.lg },
    payRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    payChip: { marginBottom: spacing.xs },
    photoWrap: { alignSelf: "flex-start", position: "relative" },
    photo: { width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: radius.segment, backgroundColor: colors.fill },
    photoOverlay: {
      position: "absolute",
      top: 0, left: 0, right: 0, bottom: 0,
      borderRadius: radius.segment,
      backgroundColor: theme.colors.backdrop,
      alignItems: "center",
      justifyContent: "center",
    },
    // White in both modes: it sits on the dark scrim over the photo, like text on the gradient.
    photoOverlayText: { color: colors.onGradient, marginTop: spacing.xs },
    photoBadge: {
      position: "absolute",
      top: spacing.xs,
      right: spacing.xs,
      backgroundColor: colors.surfaceCard,
      borderRadius: PHOTO_BADGE_SIZE / 2,
    },
    photoButton: { marginTop: spacing.sm },
    mapOption: { justifyContent: "flex-start", marginVertical: 2 },
    mapOptionContent: { justifyContent: "flex-start" },
  });
};
