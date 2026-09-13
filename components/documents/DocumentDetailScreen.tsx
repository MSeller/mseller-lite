import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Banner,
  Button,
  Chip,
  Divider,
  Icon,
  Text,
  useTheme,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import type { CustomTheme } from "../../constants/Theme";
import { useTranslation } from "../../hooks/useTranslation";
import { getDocument } from "../../services/documentService";
import type { DocumentDetail } from "../../types/documents";
import {
  formatDateShort,
  formatMoney,
  formatQuantity,
  formatUnitWithFactor,
} from "../../utils/documentFormat";
import AppCard from "../ui/AppCard";
import SectionHeader from "../ui/SectionHeader";
import DocumentShareSheet from "./DocumentShareSheet";
import DocumentStatusChip from "./DocumentStatusChip";
import { getDocumentTypeMeta } from "./documentMeta";

interface Props {
  noPedidoStr: string;
}

/**
 * A captured document, read back from the server.
 *
 * Deliberately read-only: editing a document that may already be in a route, on
 * an NCF, or in the ERP is a portal decision with its own rules, and a phone
 * screen is the wrong place to make it.
 */
const DocumentDetailScreen: React.FC<Props> = ({ noPedidoStr }) => {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();

  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shareVisible, setShareVisible] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDocument(await getDocument(noPedidoStr));
      setError("");
    } catch (e: any) {
      setError(
        e?.response?.status === 404
          ? t("documents.errors.notFound")
          : t("documents.errors.loadFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [noPedidoStr, t]);

  useEffect(() => {
    load();
  }, [load]);

  const goBack = useCallback(() => {
    // A document reached by `replace` right after capture has nothing behind it,
    // so fall back to the list instead of leaving a dead back button.
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/documents");
  }, [router]);

  const meta = document ? getDocumentTypeMeta(document.tipoDocumento) : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Appbar.Header mode="small" style={styles.appbar}>
        <Appbar.BackAction onPress={goBack} />
        {/* MD3 Appbar.Content ignores `subtitle`; the document type is shown on
            the card below, next to the status. */}
        <Appbar.Content title={document?.noPedidoStr ?? noPedidoStr} />
        {!!document && (
          <Appbar.Action
            icon="printer"
            accessibilityLabel={t("documents.share.title")}
            onPress={() => setShareVisible(true)}
          />
        )}
      </Appbar.Header>

      {!!error && (
        <Banner visible icon="alert-circle-outline" actions={[{ label: t("common.retry"), onPress: load }]}>
          {error}
        </Banner>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : !document ? (
        // "Not found" only when the request came back without a failure to report.
        // On a network or server error the banner above says what happened, and
        // claiming the document does not exist would be a different, wrong answer.
        error ? null : (
          <View style={styles.center}>
            <Icon source="file-remove-outline" size={56} color={theme.colors.onSurfaceVariant} />
            <Text style={styles.emptyText}>{t("documents.errors.notFound")}</Text>
          </View>
        )
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <AppCard style={styles.card}>
            <View style={styles.headerCardContent}>
              <View style={styles.headerTop}>
                <View style={styles.headerLeft}>
                  <Text variant="titleLarge" style={styles.customerName} numberOfLines={2}>
                    {document.nombreCliente || document.codigoCliente || t("documents.noCustomer")}
                  </Text>
                  <Text variant="bodySmall" style={styles.metaText}>
                    {document.codigoCliente} · {formatDateShort(document.fecha)}
                  </Text>
                </View>
                <View style={styles.headerChips}>
                  {!!meta && (
                    <Chip compact style={styles.typeChip} textStyle={styles.typeChipText}>
                      {t(meta.labelKey)}
                    </Chip>
                  )}
                  <DocumentStatusChip procesado={document.procesado} anulado={document.anulado} />
                </View>
              </View>

              {!!document.ncf && (
                <View style={styles.metaRow}>
                  <Text variant="bodySmall" style={styles.metaLabel}>
                    {t("documents.ncf")}
                  </Text>
                  <Text variant="bodySmall" style={styles.metaValue}>
                    {document.ncf}
                  </Text>
                </View>
              )}
              {!!document.condicionPago && (
                <View style={styles.metaRow}>
                  <Text variant="bodySmall" style={styles.metaLabel}>
                    {t("documents.paymentCondition")}
                  </Text>
                  <Text variant="bodySmall" style={styles.metaValue}>
                    {document.condicionPago}
                  </Text>
                </View>
              )}
              {!!document.fechaVencimiento && (
                <View style={styles.metaRow}>
                  <Text variant="bodySmall" style={styles.metaLabel}>
                    {t("documents.dueDate")}
                  </Text>
                  <Text variant="bodySmall" style={styles.metaValue}>
                    {formatDateShort(document.fechaVencimiento)}
                  </Text>
                </View>
              )}
              {!!document.nota && (
                <View style={styles.noteBox}>
                  <Text variant="bodySmall" style={styles.noteText}>
                    {document.nota}
                  </Text>
                </View>
              )}
            </View>
          </AppCard>

          <SectionHeader
            title={`${t("documents.lines")} (${document.detalle.length})`}
          />

          <AppCard style={styles.card}>
            <View style={styles.linesContent}>
              {document.detalle.map((line, index) => (
                <View key={`${line.codigoProducto}-${index}`}>
                  {index > 0 && <Divider style={styles.lineDivider} />}
                  <View style={styles.lineRow}>
                    <View style={styles.lineBody}>
                      <Text variant="bodyMedium" style={styles.lineTitle} numberOfLines={2}>
                        {line.descripcion || line.codigoProducto}
                      </Text>
                      <Text variant="bodySmall" style={styles.metaText}>
                        {formatQuantity(line.cantidad)}
                        {formatUnitWithFactor(line.unidad, line.factor)
                          ? ` ${formatUnitWithFactor(line.unidad, line.factor)}`
                          : ""}{" "}
                        × {formatMoney(line.precio)}
                        {line.porcientoDescuento > 0 ? ` · -${line.porcientoDescuento}%` : ""}
                      </Text>
                    </View>
                    <Text variant="bodyMedium" style={styles.lineTotal}>
                      {formatMoney(line.total)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </AppCard>

          <AppCard variant="inset" style={styles.totalsCard}>
            <View style={styles.totalsContent}>
              <View style={styles.totalsRow}>
                <Text variant="bodyMedium" style={styles.metaLabel}>
                  {t("documents.subtotal")}
                </Text>
                <Text variant="bodyMedium" style={styles.metaValue}>
                  {formatMoney(document.subTotal)}
                </Text>
              </View>
              <View style={styles.totalsRow}>
                <Text variant="bodyMedium" style={styles.metaLabel}>
                  {t("documents.discount")}
                </Text>
                <Text variant="bodyMedium" style={styles.metaValue}>
                  -{formatMoney(document.descuento)}
                </Text>
              </View>
              <View style={styles.totalsRow}>
                <Text variant="bodyMedium" style={styles.metaLabel}>
                  {t("documents.tax")}
                </Text>
                <Text variant="bodyMedium" style={styles.metaValue}>
                  {formatMoney(document.impuesto)}
                </Text>
              </View>
              <Divider style={styles.lineDivider} />
              <View style={styles.totalsRow}>
                <Text variant="titleMedium" style={styles.grandTotalLabel}>
                  {t("documents.total")}
                </Text>
                <Text variant="titleLarge" style={styles.grandTotal}>
                  {formatMoney(document.total)}
                </Text>
              </View>
            </View>
          </AppCard>

          <Button
            mode="contained"
            icon="printer"
            onPress={() => setShareVisible(true)}
            style={styles.shareButton}
            contentStyle={styles.newButtonContent}
          >
            {t("documents.share.action")}
          </Button>

          <Button
            mode="outlined"
            icon="plus"
            onPress={() => router.replace("/documentos/nuevo")}
            style={styles.newButton}
            contentStyle={styles.newButtonContent}
          >
            {t("documents.newDocument")}
          </Button>
        </ScrollView>
      )}

      <DocumentShareSheet
        visible={shareVisible}
        onDismiss={() => setShareVisible(false)}
        noPedidoStr={document?.noPedidoStr ?? noPedidoStr}
        emailCliente={document?.emailCliente}
      />
    </SafeAreaView>
  );
};

const createStyles = (theme: CustomTheme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    appbar: {
      backgroundColor: theme.colors.surface,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    emptyText: {
      color: theme.colors.onSurfaceVariant,
    },
    content: {
      padding: 16,
      paddingBottom: 32,
      gap: 12,
    },
    card: {
      marginBottom: 4,
    },
    headerCardContent: {
      padding: 16,
      gap: 8,
    },
    headerTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
    },
    headerLeft: {
      flex: 1,
      gap: 2,
    },
    headerChips: {
      alignItems: "flex-end",
      gap: 6,
    },
    typeChip: {
      backgroundColor: theme.colors.primaryContainer,
    },
    typeChipText: {
      color: theme.colors.onPrimaryContainer,
      fontSize: 11,
      fontWeight: "600",
      marginVertical: 2,
    },
    customerName: {
      color: theme.colors.onSurface,
      fontWeight: "700",
    },
    metaText: {
      color: theme.colors.onSurfaceVariant,
    },
    metaRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
    },
    metaLabel: {
      color: theme.colors.onSurfaceVariant,
    },
    metaValue: {
      color: theme.colors.onSurface,
      fontWeight: "600",
      flexShrink: 1,
      textAlign: "right",
    },
    noteBox: {
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.custom.radius.sm,
      padding: 12,
      marginTop: 4,
    },
    noteText: {
      color: theme.colors.onSurface,
      lineHeight: 18,
    },
    linesContent: {
      paddingHorizontal: 16,
      paddingVertical: 6,
    },
    lineRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      paddingVertical: 10,
    },
    lineBody: {
      flex: 1,
      gap: 2,
    },
    lineTitle: {
      color: theme.colors.onSurface,
      fontWeight: "600",
    },
    lineTotal: {
      color: theme.colors.onSurface,
      fontWeight: "700",
    },
    lineDivider: {
      marginVertical: 2,
    },
    totalsCard: {
      marginTop: 4,
    },
    totalsContent: {
      gap: 8,
      padding: 16,
    },
    totalsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    grandTotalLabel: {
      color: theme.colors.onSurface,
      fontWeight: "700",
    },
    grandTotal: {
      color: theme.colors.primary,
      fontWeight: "800",
    },
    shareButton: {
      borderRadius: theme.custom.radius.md,
      marginTop: 4,
    },
    newButton: {
      borderRadius: theme.custom.radius.md,
      borderColor: theme.colors.outlineVariant,
    },
    newButtonContent: {
      height: 52,
    },
  });

export default DocumentDetailScreen;
