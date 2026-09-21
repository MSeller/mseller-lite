import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Appbar, Banner, Divider, Icon, Text, useTheme } from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import type { CustomTheme } from "../../constants/Theme";
import { useTranslation } from "../../hooks/useTranslation";
import { getPurchaseRequest } from "../../services/b2bService";
import type { SolicitudB2B, SolicitudLinea } from "../../types/b2b";
import { describeB2BError, solicitudTone } from "../../utils/b2b";
import { formatDateTime, formatMoney, formatQuantity } from "../../utils/documentFormat";
import AppCard from "../ui/AppCard";
import EmptyState from "../ui/EmptyState";
import SectionHeader from "../ui/SectionHeader";
import StatusChip from "../ui/StatusChip";

interface Props {
  noSolicitud: string;
  /** Set right after the request was sent, so the screen leads with the confirmation. */
  justCreated?: boolean;
}

/**
 * One purchase request, as the supplier left it.
 *
 * The important thing this screen does is show what the supplier CHANGED. A rep routinely
 * confirms less than was asked for — half a case instead of two, nothing at all for
 * something out of stock — and a screen that showed only the confirmed number would let
 * the buyer discover the cut when the truck arrives. So every line that differs shows
 * both figures, marked.
 */
const RequestDetailScreen: React.FC<Props> = ({ noSolicitud, justCreated = false }) => {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [solicitud, setSolicitud] = useState<SolicitudB2B | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSolicitud(await getPurchaseRequest(noSolicitud));
      setError("");
    } catch (e) {
      const failure = describeB2BError(e);
      setError(
        failure.kind === "notFound"
          ? t("marketplace.errors.requestNotFound")
          : failure.message || t("marketplace.errors.requestFailedLoad")
      );
    } finally {
      setLoading(false);
    }
  }, [noSolicitud, t]);

  useEffect(() => {
    load();
  }, [load]);

  const goBack = () => {
    // Reached by `replace` straight after sending, so there may be nothing behind it.
    if (router.canGoBack()) router.back();
    else router.replace("/marketplace/solicitudes");
  };

  const adjusted = (line: SolicitudLinea) =>
    line.cantidadConfirmada !== line.cantidadSolicitada;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Appbar.Header mode="small" style={styles.appbar}>
        <Appbar.BackAction onPress={goBack} />
        <Appbar.Content title={solicitud?.noSolicitud ?? noSolicitud} />
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
      ) : !solicitud ? (
        error ? null : (
          <View style={styles.center}>
            <EmptyState icon="clipboard-text-outline" message={t("marketplace.errors.requestNotFound")} />
          </View>
        )
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}>
          {justCreated && (
            <AppCard>
              <View style={styles.createdCard}>
                <Icon
                  source="check-circle-outline"
                  size={40}
                  color={theme.custom.status.positive.base}
                />
                <Text variant="titleMedium" style={styles.createdTitle}>
                  {t("marketplace.requestCreatedTitle")}
                </Text>
                <Text variant="headlineSmall" style={styles.createdNumber}>
                  {solicitud.noSolicitud}
                </Text>
                <Text variant="bodyMedium" style={styles.meta}>
                  {t("marketplace.requestCreatedBody", { tienda: solicitud.tiendaNombre })}
                </Text>
              </View>
            </AppCard>
          )}

          <AppCard>
            <View style={styles.headerCard}>
              <View style={styles.headerTop}>
                <View style={styles.headerLeft}>
                  <Text variant="titleMedium" style={styles.store} numberOfLines={2}>
                    {solicitud.tiendaNombre}
                  </Text>
                  <Text variant="bodySmall" style={styles.meta}>
                    {formatDateTime(solicitud.creadoEn)}
                  </Text>
                </View>
                <StatusChip
                  label={t(`marketplace.requestState.${solicitud.estado}`)}
                  tone={solicitudTone(solicitud.estado)}
                />
              </View>

              {!!solicitud.noPedidoStr && (
                <>
                  <Divider style={styles.divider} />
                  <View style={styles.infoRow}>
                    <Text variant="bodyMedium" style={styles.meta}>
                      {t("marketplace.supplierOrder")}
                    </Text>
                    <Text variant="bodyMedium" style={styles.value}>
                      {solicitud.noPedidoStr}
                    </Text>
                  </View>
                </>
              )}

              {!!solicitud.resueltaEn && (
                <View style={styles.infoRow}>
                  <Text variant="bodyMedium" style={styles.meta}>
                    {t("marketplace.resolvedAt")}
                  </Text>
                  <Text variant="bodyMedium" style={styles.value}>
                    {formatDateTime(solicitud.resueltaEn)}
                  </Text>
                </View>
              )}

              {!!solicitud.comentario && (
                <>
                  <Divider style={styles.divider} />
                  <Text variant="bodySmall" style={styles.meta}>
                    {t("marketplace.comment")}
                  </Text>
                  <Text variant="bodyMedium" style={styles.value}>
                    {solicitud.comentario}
                  </Text>
                </>
              )}
            </View>
          </AppCard>

          {!!solicitud.razonRechazo && (
            <View style={styles.rejection}>
              <Text variant="labelLarge" style={styles.rejectionTitle}>
                {t("marketplace.rejectionReason")}
              </Text>
              <Text variant="bodyMedium" style={styles.rejectionBody}>
                {solicitud.razonRechazo}
              </Text>
            </View>
          )}

          <View>
            <SectionHeader
              title={t("marketplace.lines")}
              trailing={
                <Text variant="bodySmall" style={styles.meta}>
                  {t("marketplace.lineCount", { count: solicitud.lineas.length })}
                </Text>
              }
            />
            {solicitud.lineas.map((line) => (
              <AppCard key={line.id} style={styles.lineCard}>
                <View style={styles.lineContent}>
                  <View style={styles.lineHeader}>
                    <View style={styles.lineTitle}>
                      <Text variant="titleSmall" style={styles.lineName} numberOfLines={2}>
                        {line.descripcion || line.codigoProducto}
                      </Text>
                      <Text variant="bodySmall" style={styles.meta} numberOfLines={1}>
                        {line.codigoProducto}
                        {line.unidad ? ` · ${line.unidad}` : ""} · {formatMoney(line.precio)}
                      </Text>
                    </View>
                    <Text variant="titleMedium" style={styles.lineTotal}>
                      {formatMoney(line.importe)}
                    </Text>
                  </View>

                  {adjusted(line) ? (
                    // The supplier changed this line. Both numbers, side by side, with the
                    // one that was asked for struck through — the buyer has to be able to
                    // see what was cut, not just what is coming.
                    <View style={styles.adjusted}>
                      <Icon
                        source="swap-horizontal"
                        size={16}
                        color={theme.custom.status.warning.onContainer}
                      />
                      <Text variant="bodySmall" style={styles.requested}>
                        {t("marketplace.requestedQuantity", {
                          value: formatQuantity(line.cantidadSolicitada),
                        })}
                      </Text>
                      <Text variant="bodySmall" style={styles.adjustedArrow}>
                        →
                      </Text>
                      <Text variant="bodySmall" style={styles.confirmed}>
                        {t("marketplace.confirmedQuantity", {
                          value: formatQuantity(line.cantidadConfirmada),
                        })}
                      </Text>
                    </View>
                  ) : (
                    <Text variant="bodySmall" style={styles.meta}>
                      {t("marketplace.requestedQuantity", {
                        value: formatQuantity(line.cantidadSolicitada),
                      })}
                    </Text>
                  )}
                </View>
              </AppCard>
            ))}
          </View>

          <AppCard variant="inset">
            <View style={styles.totalsCard}>
              <Text variant="bodyMedium" style={styles.meta}>
                {t("marketplace.total")}
              </Text>
              <Text variant="titleLarge" style={styles.total}>
                {formatMoney(solicitud.total)}
              </Text>
            </View>
          </AppCard>
        </ScrollView>
      )}
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
      backgroundColor: theme.colors.background,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
    },
    content: {
      padding: 16,
      gap: 14,
    },
    createdCard: {
      padding: 20,
      alignItems: "center",
      gap: 6,
    },
    createdTitle: {
      color: theme.colors.onSurface,
      fontWeight: "700",
    },
    createdNumber: {
      color: theme.colors.primary,
      fontWeight: "700",
      letterSpacing: 1,
    },
    headerCard: {
      padding: 14,
      gap: 6,
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
    store: {
      color: theme.colors.onSurface,
      fontWeight: "700",
    },
    meta: {
      color: theme.colors.onSurfaceVariant,
    },
    value: {
      color: theme.colors.onSurface,
      fontWeight: "600",
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      paddingVertical: 2,
    },
    divider: {
      marginVertical: 8,
    },
    rejection: {
      padding: 14,
      borderRadius: theme.custom.radius.md,
      backgroundColor: theme.custom.status.negative.container,
      gap: 4,
    },
    rejectionTitle: {
      color: theme.custom.status.negative.onContainer,
      fontWeight: "700",
    },
    rejectionBody: {
      color: theme.custom.status.negative.onContainer,
    },
    lineCard: {
      marginBottom: 10,
    },
    lineContent: {
      paddingVertical: 12,
      paddingHorizontal: 14,
      gap: 8,
    },
    lineHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },
    lineTitle: {
      flex: 1,
      gap: 2,
    },
    lineName: {
      color: theme.colors.onSurface,
      fontWeight: "600",
    },
    lineTotal: {
      color: theme.colors.onSurface,
      fontWeight: "700",
    },
    // Un cambio del suplidor no puede parecer texto de apoyo: va sobre su propio
    // contenedor tintado, con las DOS cifras (pedida tachada → confirmada) visibles.
    adjusted: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      flexWrap: "wrap",
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: theme.custom.radius.sm,
      backgroundColor: theme.custom.status.warning.container,
    },
    requested: {
      color: theme.custom.status.warning.onContainer,
      textDecorationLine: "line-through",
    },
    adjustedArrow: {
      color: theme.custom.status.warning.onContainer,
    },
    confirmed: {
      color: theme.custom.status.warning.onContainer,
      fontWeight: "700",
    },
    totalsCard: {
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    total: {
      color: theme.colors.onSurface,
      fontWeight: "700",
    },
  });

export default RequestDetailScreen;
