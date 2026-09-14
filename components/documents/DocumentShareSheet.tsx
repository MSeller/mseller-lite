import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Chip,
  Divider,
  Icon,
  Modal,
  Portal,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";

import type { CustomTheme } from "../../constants/Theme";
import { usePrinter } from "../../contexts/PrinterContext";
import { useTranslation } from "../../hooks/useTranslation";
import {
  getDocumentPdf,
  getDocumentShareHistory,
  getDocumentTicket,
  resendDocument,
  sendDocument,
} from "../../services/documentService";
import { parseTicketMarkup } from "../../services/printing/markup/parse";
import type { Ticket } from "../../services/printing/markup/types";
import type { DocumentSend, DocumentShareHistory } from "../../types/documents";
import { formatDateTime } from "../../utils/documentFormat";
import {
  canPresentPdf,
  downloadPdf,
  pdfFileName,
  printPdf,
  releasePrintWindow,
  reservePrintTarget,
} from "../../utils/documentPdf";
import { describePrinterError } from "../printing/printerErrors";
import TicketPreview from "../printing/TicketPreview";

interface Props {
  visible: boolean;
  onDismiss: () => void;
  noPedidoStr: string;
  /** The document's customer address, pre-filled as the recipient. */
  emailCliente?: string | null;
}

type Busy = "none" | "print" | "download" | "send" | "resend" | "ticket" | "ticketPrint";

/**
 * Everything you can do with a document once it exists: print it, save the PDF, email it to
 * the customer, and see what has already been sent so you can re-send rather than guess.
 *
 * Deliberately one sheet rather than four scattered buttons. In the field these are one
 * decision — "get this document to the customer" — and the right choice depends on what
 * already happened, which is why the history is in the same place as the actions.
 */
const DocumentShareSheet: React.FC<Props> = ({ visible, onDismiss, noPedidoStr, emailCliente }) => {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();
  const { available: ticketDisponible, printer, profile, printTicket } = usePrinter();

  const [history, setHistory] = useState<DocumentShareHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Busy>("none");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [emailMode, setEmailMode] = useState(false);
  const [destinatarios, setDestinatarios] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [ticket, setTicket] = useState<Ticket | null>(null);

  const pdfDisponible = canPresentPdf();

  // Every load is stamped with the generation current when it started, so a slow response
  // cannot land after a newer one and repopulate the sheet with a stale history. Not
  // theoretical: DocumentDetailScreen passes `document?.noPedidoStr ?? noPedidoStr`, so the
  // prop changes the moment the document finishes loading and a second load starts while the
  // first may still be in flight. A stale history is not only wrong to read — Re-send acts on
  // an `envio.id` taken from it, and that would re-send the wrong document's email.
  const generacion = useRef(0);

  const load = useCallback(async () => {
    const mia = ++generacion.current;
    const vigente = () => generacion.current === mia;

    setLoading(true);
    try {
      const historial = await getDocumentShareHistory(noPedidoStr);
      if (!vigente()) return;
      setHistory(historial);
      setError("");
    } catch {
      // The history is context, not the feature. Losing it must not take the actions with it,
      // so this records the failure without blocking print or send.
      if (vigente()) setHistory(null);
    } finally {
      if (vigente()) setLoading(false);
    }
  }, [noPedidoStr]);

  useEffect(() => {
    if (!visible) return;
    setError("");
    setOk("");
    setEmailMode(false);
    setDestinatarios(emailCliente ?? "");
    setMensaje("");
    setTicket(null);
    load();
  }, [visible, emailCliente, load]);

  // A 409 here is the useful one: either the tenant has no mail configured or a send for this
  // document is already in flight. Both are things the server says better than we can guess.
  const describirError = useCallback(
    (e: any): string => {
      const status = e?.response?.status;
      if (status === 409) return e?.response?.data?.message || t("documents.share.errors.unavailable");
      if (status === 403) return t("documents.errors.forbidden");
      if (status === 404) return t("documents.errors.notFound");
      return e?.response?.data?.message || t("documents.share.errors.failed");
    },
    [t]
  );

  const handlePrint = useCallback(async () => {
    // Reserved synchronously, inside the gesture, before any await — see reservePrintTarget.
    const reserva = reservePrintTarget();

    // Stop before fetching when there is nowhere to print to: that request is the
    // non-preview one and it RECORDS a print, which would leave the history claiming a
    // copy the user never saw. The two reasons get different messages because they have
    // different fixes — allow pop-ups, versus this build cannot show PDFs at all.
    if (reserva.estado === "bloqueado") {
      setError(t("documents.share.errors.popupBlocked"));
      return;
    }
    if (reserva.estado === "noDisponible") {
      setError(t("documents.share.pdfUnavailable"));
      return;
    }

    setBusy("print");
    setError("");
    setOk("");
    try {
      const bytes = await getDocumentPdf(noPedidoStr);
      await printPdf(bytes, reserva, pdfFileName(noPedidoStr));
      load();
    } catch (e: any) {
      // On the web a tab was opened on the gesture and never got a document. Leaving it
      // behind makes the user clean up after an action that already failed.
      releasePrintWindow(reserva);
      setError(describirError(e));
    } finally {
      setBusy("none");
    }
  }, [noPedidoStr, load, describirError, t]);

  // Thermal ticket: the preview is fetched without recording a print; only handlePrintTicket,
  // which asks the server again with registrarImpresion, counts in the history.
  const handleOpenTicket = useCallback(async () => {
    if (!printer || !profile) {
      onDismiss();
      router.push("/impresoras");
      return;
    }
    setBusy("ticket");
    setError("");
    setOk("");
    try {
      const respuesta = await getDocumentTicket(noPedidoStr, { ancho: profile.columns });
      setTicket(parseTicketMarkup(respuesta.texto));
    } catch (e: any) {
      setError(describePrinterError(e, t));
    } finally {
      setBusy("none");
    }
  }, [printer, profile, noPedidoStr, onDismiss, router, t]);

  const handlePrintTicket = useCallback(async () => {
    setBusy("ticketPrint");
    setError("");
    setOk("");
    try {
      await printTicket(noPedidoStr);
      setTicket(null);
      setOk(t("documents.share.ticketSent"));
      load();
    } catch (e: any) {
      setError(describePrinterError(e, t));
      // The server may have recorded the print before the printer failed.
      load();
    } finally {
      setBusy("none");
    }
  }, [printTicket, noPedidoStr, load, t]);

  const handleDownload = useCallback(async () => {
    setBusy("download");
    setError("");
    setOk("");
    try {
      // preview: saving a copy is not printing it, and the history decides what "Re-print"
      // means.
      const bytes = await getDocumentPdf(noPedidoStr, { preview: true });
      await downloadPdf(bytes, pdfFileName(noPedidoStr));
    } catch (e: any) {
      setError(describirError(e));
    } finally {
      setBusy("none");
    }
  }, [noPedidoStr, describirError]);

  const handleSend = useCallback(async () => {
    setBusy("send");
    setError("");
    setOk("");
    try {
      const lista = destinatarios
        .split(/[,;\s]+/)
        .map((d) => d.trim())
        .filter(Boolean);

      await sendDocument(noPedidoStr, {
        // Empty means "the customer's own address", which the server resolves.
        destinatarios: lista.length > 0 ? lista : undefined,
        mensaje: mensaje.trim() || undefined,
      });
      setOk(t("documents.share.queued"));
      setEmailMode(false);
      setMensaje("");
      load();
    } catch (e: any) {
      setError(describirError(e));
    } finally {
      setBusy("none");
    }
  }, [noPedidoStr, destinatarios, mensaje, load, t, describirError]);

  const handleResend = useCallback(
    async (envio: DocumentSend) => {
      setBusy("resend");
      setError("");
      setOk("");
      try {
        await resendDocument(envio.id);
        setOk(t("documents.share.queued"));
        load();
      } catch (e: any) {
        setError(describirError(e));
      } finally {
        setBusy("none");
      }
    },
    [load, t, describirError]
  );

  const yaImpreso = (history?.vecesImpreso ?? 0) > 0;
  const ocupado = busy !== "none";

  const estadoTono = (estado: DocumentSend["estado"]) => {
    if (estado === "Enviado") return theme.custom.status.positive;
    if (estado === "Fallido" || estado === "Cancelado") return theme.custom.status.negative;
    return theme.custom.status.warning;
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={ocupado ? () => {} : onDismiss} contentContainerStyle={styles.modal}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text variant="titleLarge" style={styles.title}>
              {t("documents.share.title")}
            </Text>
            <Text variant="bodySmall" style={styles.subtitle}>
              {noPedidoStr}
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator style={styles.loader} />
          ) : ticket && profile ? (
            <View style={styles.ticketBlock}>
              <Text variant="labelLarge" style={styles.historyTitle}>
                {t("documents.share.ticketTitle")}
              </Text>
              <Text variant="bodySmall" style={styles.historyMeta}>
                {`${printer?.name || printer?.address || ""} · ${profile.brand} ${profile.model}`}
              </Text>
              <TicketPreview ticket={ticket} columns={profile.columns} hasCutter={profile.hasCutter} />
              <View style={styles.formActions}>
                <Button
                  mode="text"
                  onPress={() => setTicket(null)}
                  disabled={ocupado}
                  contentStyle={styles.actionContent}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  mode="contained"
                  icon="printer-pos"
                  onPress={handlePrintTicket}
                  loading={busy === "ticketPrint"}
                  disabled={ocupado}
                  style={styles.sendButton}
                  contentStyle={styles.actionContent}
                >
                  {t("documents.share.printTicketNow")}
                </Button>
              </View>
            </View>
          ) : (
            <>
              {!!history?.ultimaImpresion && (
                <View style={styles.lastPrint}>
                  <Icon source="printer-check" size={16} color={theme.colors.onSurfaceVariant} />
                  <Text variant="bodySmall" style={styles.lastPrintText}>
                    {/* Two explicit keys rather than i18next plurals: pluralization needs
                        Intl.PluralRules, which Hermes does not reliably ship, and a missing
                        plural rule renders the raw key at the user. */}
                    {history.vecesImpreso === 1
                      ? t("documents.share.printedOnce")
                      : t("documents.share.printedTimes", { count: history.vecesImpreso })}
                    {history.ultimoUsuarioImpresion ? ` · ${history.ultimoUsuarioImpresion}` : ""}
                    {` · ${formatDateTime(history.ultimaImpresion)}`}
                  </Text>
                </View>
              )}

              {ticketDisponible && (
                <Button
                  mode="contained"
                  icon="printer-pos"
                  onPress={handleOpenTicket}
                  loading={busy === "ticket"}
                  disabled={ocupado}
                  style={styles.action}
                  contentStyle={styles.actionContent}
                >
                  {printer ? t("documents.share.printTicket") : t("documents.share.setupPrinter")}
                </Button>
              )}

              {pdfDisponible ? (
                <View style={styles.actions}>
                  <Button
                    mode={ticketDisponible ? "contained-tonal" : "contained"}
                    // printer-check, not printer-refresh: the latter is not in the bundled
                    // MaterialCommunityIcons set and renders as a literal "?" on the button.
                    icon={yaImpreso ? "printer-check" : "printer"}
                    onPress={handlePrint}
                    loading={busy === "print"}
                    disabled={ocupado}
                    style={styles.action}
                    contentStyle={styles.actionContent}
                  >
                    {yaImpreso ? t("documents.share.reprint") : t("documents.share.print")}
                  </Button>
                  <Button
                    mode="outlined"
                    icon="file-download-outline"
                    onPress={handleDownload}
                    loading={busy === "download"}
                    disabled={ocupado}
                    style={styles.action}
                    contentStyle={styles.actionContent}
                  >
                    {t("documents.share.savePdf")}
                  </Button>
                </View>
              ) : (
                <View style={styles.notice}>
                  <Icon source="information-outline" size={16} color={theme.colors.onSurfaceVariant} />
                  <Text variant="bodySmall" style={styles.noticeText}>
                    {t("documents.share.pdfUnavailable")}
                  </Text>
                </View>
              )}

              <Divider style={styles.divider} />

              {emailMode ? (
                <View style={styles.form}>
                  <TextInput
                    mode="outlined"
                    label={t("documents.share.recipients")}
                    placeholder={t("documents.share.recipientsHint")}
                    value={destinatarios}
                    onChangeText={setDestinatarios}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    inputMode="email"
                    style={styles.input}
                    right={
                      destinatarios ? (
                        <TextInput.Icon icon="close" onPress={() => setDestinatarios("")} />
                      ) : null
                    }
                  />
                  <TextInput
                    mode="outlined"
                    label={t("documents.share.message")}
                    value={mensaje}
                    onChangeText={setMensaje}
                    multiline
                    numberOfLines={3}
                    style={styles.input}
                  />
                  <View style={styles.formActions}>
                    <Button
                      mode="text"
                      onPress={() => setEmailMode(false)}
                      disabled={ocupado}
                      contentStyle={styles.actionContent}
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button
                      mode="contained"
                      icon="send"
                      onPress={handleSend}
                      loading={busy === "send"}
                      disabled={ocupado}
                      style={styles.sendButton}
                      contentStyle={styles.actionContent}
                    >
                      {t("documents.share.send")}
                    </Button>
                  </View>
                </View>
              ) : (
                <Button
                  mode="contained-tonal"
                  icon="email-outline"
                  onPress={() => setEmailMode(true)}
                  disabled={ocupado}
                  style={styles.action}
                  contentStyle={styles.actionContent}
                >
                  {t("documents.share.emailIt")}
                </Button>
              )}

              {!!history?.envios?.length && (
                <View style={styles.historyBlock}>
                  <Text variant="labelLarge" style={styles.historyTitle}>
                    {t("documents.share.history")}
                  </Text>
                  {/* The server caps the list at its newest sends. Without saying so, a
                      capped history reads as the whole story — which matters here, because
                      the reason to open this block is to find a send and re-send it. */}
                  {(history.totalEnvios ?? 0) > history.envios.length && (
                    <Text variant="bodySmall" style={styles.historyMeta}>
                      {t("documents.share.historyCapped", {
                        shown: history.envios.length,
                        total: history.totalEnvios,
                      })}
                    </Text>
                  )}
                  {history.envios.map((envio) => {
                    const tono = estadoTono(envio.estado);
                    return (
                      <View key={envio.id} style={styles.historyRow}>
                        <View style={styles.historyBody}>
                          <Text variant="bodyMedium" style={styles.historyTo} numberOfLines={2}>
                            {envio.destinatarios.join(", ") || t("documents.share.noRecipients")}
                          </Text>
                          <Text variant="bodySmall" style={styles.historyMeta}>
                            {formatDateTime(envio.enviadoEn || envio.creadoEn)}
                            {envio.reenvioDeId ? ` · ${t("documents.share.isResend")}` : ""}
                          </Text>
                          {!!envio.errorMensaje && (
                            <Text variant="bodySmall" style={styles.historyError} numberOfLines={2}>
                              {envio.errorMensaje}
                            </Text>
                          )}
                        </View>
                        <View style={styles.historyRight}>
                          <Chip
                            compact
                            style={[styles.stateChip, { backgroundColor: tono.container }]}
                            textStyle={[styles.stateChipText, { color: tono.onContainer }]}
                          >
                            {t(`documents.share.state.${envio.estado}`)}
                          </Chip>
                          <Button
                            mode="text"
                            compact
                            icon="email-sync-outline"
                            onPress={() => handleResend(envio)}
                            disabled={ocupado}
                          >
                            {t("documents.share.resend")}
                          </Button>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}

          {!!ok && (
            <View style={[styles.banner, { backgroundColor: theme.custom.status.positive.container }]}>
              <Text variant="bodySmall" style={{ color: theme.custom.status.positive.onContainer }}>
                {ok}
              </Text>
            </View>
          )}
          {!!error && (
            <View style={[styles.banner, { backgroundColor: theme.custom.status.negative.container }]}>
              <Text variant="bodySmall" style={{ color: theme.custom.status.negative.onContainer }}>
                {error}
              </Text>
            </View>
          )}

          <Button mode="text" onPress={onDismiss} disabled={ocupado} contentStyle={styles.actionContent}>
            {t("common.close")}
          </Button>
        </ScrollView>
      </Modal>
    </Portal>
  );
};

const createStyles = (theme: CustomTheme) =>
  StyleSheet.create({
    modal: {
      backgroundColor: theme.colors.surface,
      marginHorizontal: 16,
      borderRadius: theme.custom.radius.lg,
      maxHeight: "88%",
    },
    content: { padding: 20, gap: 12 },
    header: { gap: 2 },
    title: { color: theme.colors.onSurface, fontWeight: "700" },
    subtitle: { color: theme.colors.onSurfaceVariant },
    loader: { marginVertical: 24 },
    lastPrint: { flexDirection: "row", alignItems: "center", gap: 6 },
    lastPrintText: { color: theme.colors.onSurfaceVariant, flex: 1 },
    actions: { gap: 8 },
    action: { borderRadius: theme.custom.radius.md },
    // 52px keeps every action a comfortable tap target on a touch screen.
    actionContent: { height: 52 },
    notice: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.custom.radius.sm,
      padding: 12,
    },
    noticeText: { color: theme.colors.onSurfaceVariant, flex: 1, lineHeight: 18 },
    divider: { marginVertical: 4 },
    form: { gap: 10 },
    input: { backgroundColor: theme.colors.surface },
    formActions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 8 },
    sendButton: { borderRadius: theme.custom.radius.md, minWidth: 140 },
    historyBlock: { gap: 6, marginTop: 4 },
    historyTitle: { color: theme.colors.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 0.6 },
    historyRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 8,
      paddingVertical: 8,
      borderTopWidth: theme.custom.hairline,
      borderTopColor: theme.colors.outlineVariant,
    },
    historyBody: { flex: 1, gap: 2 },
    historyTo: { color: theme.colors.onSurface, fontWeight: "600" },
    historyMeta: { color: theme.colors.onSurfaceVariant },
    historyError: { color: theme.colors.error },
    historyRight: { alignItems: "flex-end", gap: 2 },
    stateChip: { alignSelf: "flex-end" },
    stateChipText: { fontSize: 11, fontWeight: "600", marginVertical: 2 },
    banner: { borderRadius: theme.custom.radius.sm, padding: 12 },
    ticketBlock: { gap: 8 },
  });

export default DocumentShareSheet;
