import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon, Snackbar, Text, useTheme } from "react-native-paper";
import { gutterFor, type CustomTheme } from "@/constants/Theme";
import { useTranslation } from "@/hooks/useTranslation";
import { preparacionService } from "../../../services/preparacionService";
import {
  SummaryCliente,
  SummaryClienteProducto,
  SummaryResponse,
  SummaryZona,
} from "../../../types/preparacion";
import SectionAccessGate from "../../../components/navigation/SectionAccessGate";
import EmptyState from "../../../components/ui/EmptyState";
import PrepFooter from "../../../components/preparacion/PrepFooter";

type SummaryTab = "zones" | "customers";

/** Unified row type for SectionList */
interface SummaryRow {
  codigoProducto: string;
  descripcion: string;
  cantidad: number;
  cantidadSolicitada?: number;
  cantidadConfirmada?: number;
  unidad?: string;
}

interface SummarySection {
  title: string;
  data: SummaryRow[];
}

function SummaryScreen() {
  const theme = useTheme() as CustomTheme;
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme, gutterFor(width)), [theme, width]);
  const { colors, status } = theme.custom;
  const router = useRouter();
  const { t } = useTranslation();
  const { rutaId } = useLocalSearchParams<{ rutaId: string }>();
  const numericRutaId = parseInt(rutaId ?? "0", 10);

  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState<SummaryTab>("zones");

  const loadSummary = useCallback(async () => {
    try {
      setError("");
      const response = await preparacionService.getSummary(numericRutaId);
      setData(response);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
      setError(
        axiosErr.response?.data?.message ||
          axiosErr.message ||
          t("preparacion.errorLoadingSummary")
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [numericRutaId, t]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadSummary();
  }, [loadSummary]);

  const handleCompletePreparation = async () => {
    try {
      setCompleting(true);
      await preparacionService.completarPreparacion(numericRutaId);
      setSuccess(t("preparacion.completedSuccess"));
      setTimeout(() => {
        router.dismissAll();
      }, 1500);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
      setError(
        axiosErr.response?.data?.message || t("preparacion.errorCompleting")
      );
    } finally {
      setCompleting(false);
    }
  };

  // Zone breakdown sections
  const zoneSections: SummarySection[] = (data?.zonas ?? []).map(
    (zona: SummaryZona) => ({
      title: zona.zona,
      data: zona.productos.map((p) => ({
        codigoProducto: p.codigoProducto,
        descripcion: p.descripcion,
        cantidad: p.cantidadConfirmada,
        cantidadSolicitada: p.cantidadSolicitada,
        cantidadConfirmada: p.cantidadConfirmada,
        unidad: p.unidad,
      })),
    })
  );

  // Customer breakdown sections
  const customerSections: SummarySection[] = (data?.clientes ?? []).map(
    (cliente: SummaryCliente) => ({
      title: `${cliente.nombreCliente} (${cliente.codigoCliente})`,
      data: cliente.productos.map((p: SummaryClienteProducto) => ({
        codigoProducto: p.codigoProducto,
        descripcion: p.descripcion,
        cantidad: p.cantidadConfirmada,
        cantidadSolicitada: p.cantidadSolicitada,
        cantidadConfirmada: p.cantidadConfirmada,
      })),
    })
  );

  const activeSections = activeTab === "zones" ? zoneSections : customerSections;

  const tabs: { key: SummaryTab; icon: string; label: string }[] = [
    { key: "zones", icon: "map-marker-outline", label: t("preparacion.zoneBreakdown") },
    { key: "customers", icon: "account-group-outline", label: t("preparacion.customerBreakdown") },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={["left", "right"]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={styles.loadingText}>{t("preparacion.summaryLoading")}</Text>
      </SafeAreaView>
    );
  }

  const renderRow = ({ item }: { item: SummaryRow }) => {
    const match = item.cantidadConfirmada === item.cantidadSolicitada;
    const tone = match ? status.positive : status.warning;
    const meta = [item.codigoProducto, item.unidad].filter(Boolean).join(" · ");
    return (
      <View
        style={styles.productRow}
        accessible
        accessibilityLabel={`${item.descripcion}, ${meta}, ${item.cantidadConfirmada} / ${item.cantidadSolicitada}`}
      >
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.descripcion}
          </Text>
          <Text style={styles.caption} numberOfLines={1}>
            {meta}
          </Text>
        </View>
        <View style={styles.productQty}>
          <Icon source={match ? "check-circle" : "alert-circle"} size={18} color={tone.base} />
          <Text style={[styles.qtyText, !match && { color: tone.base }]}>
            {item.cantidadConfirmada}
          </Text>
          <Text style={styles.qtyTotal}>{`/ ${item.cantidadSolicitada}`}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      {/* Zones / customers: two views of the same data, so a segmented control. */}
      <View style={styles.segments} accessibilityRole="tablist">
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.segment, active && styles.segmentActive]}
              onPress={() => setActiveTab(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Icon source={tab.icon} size={18} color={active ? colors.ink : colors.inkSecondary} />
              <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]} numberOfLines={1}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SectionList<SummaryRow, SummarySection>
        sections={activeSections}
        keyExtractor={(item, index) => item.codigoProducto + index}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle} numberOfLines={1}>
              {`${activeTab === "zones" ? `${t("preparacion.zone")} ${section.title}` : section.title} · ${t(
                "preparacion.ui.productCount",
                { count: section.data.length }
              )}`}
            </Text>
          </View>
        )}
        renderItem={renderRow}
        stickySectionHeadersEnabled
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !data && !!error ? (
            <EmptyState
              icon="alert-circle-outline"
              title={t("preparacion.errorLoadingSummary")}
              message={error}
              action={{ label: t("common.retry"), icon: "refresh", onPress: loadSummary }}
            />
          ) : (
            <EmptyState
              icon="clipboard-text-outline"
              title={t("preparacion.noSummaryData")}
              message={t("preparacion.ui.noSummaryBody")}
            />
          )
        }
      />

      <PrepFooter
        label={
          completing
            ? t("preparacion.completingPreparation")
            : t("preparacion.completePreparation")
        }
        icon="check-all"
        onPress={handleCompletePreparation}
        loading={completing}
      />

      <Snackbar
        // The empty state already shows a failure with nothing loaded.
        visible={!!error && !!data}
        onDismiss={() => setError("")}
        duration={4000}
        action={{
          label: t("common.retry"),
          onPress: () => {
            setError("");
            loadSummary();
          },
        }}
      >
        {error}
      </Snackbar>

      <Snackbar
        visible={!!success}
        onDismiss={() => setSuccess("")}
        duration={3000}
      >
        {success}
      </Snackbar>
    </SafeAreaView>
  );
}

const createStyles = (theme: CustomTheme, gutter: number) => {
  const { colors, spacing, type, radius, hairline, touchTarget } = theme.custom;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: spacing.lg,
      backgroundColor: colors.background,
    },
    loadingText: {
      ...type.bodySmall,
    },
    segments: {
      flexDirection: "row",
      marginHorizontal: gutter,
      marginTop: spacing.md,
      padding: spacing.xs / 2,
      borderRadius: radius.segment,
      backgroundColor: colors.fill,
    },
    segment: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      minHeight: touchTarget - spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.tag,
    },
    segmentActive: {
      backgroundColor: colors.surfaceCard,
    },
    segmentLabel: {
      ...type.bodySmall,
      flexShrink: 1,
    },
    segmentLabelActive: {
      color: colors.ink,
      fontWeight: "600",
    },
    // Sticky over the rows, so it carries the page colour and closes with a hairline.
    sectionHeader: {
      paddingHorizontal: gutter,
      paddingTop: spacing.xl,
      paddingBottom: spacing.sm,
      backgroundColor: colors.background,
      borderBottomWidth: hairline,
      borderBottomColor: colors.hairline,
    },
    sectionTitle: {
      ...type.overline,
    },
    productRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: gutter,
      paddingVertical: spacing.md,
      minHeight: touchTarget + spacing.lg,
      borderBottomWidth: hairline,
      borderBottomColor: colors.hairline,
    },
    productInfo: {
      flex: 1,
      minWidth: 0,
    },
    productName: {
      ...type.rowTitle,
    },
    caption: {
      ...type.caption,
    },
    productQty: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: spacing.xs,
    },
    qtyText: {
      ...type.figure(22),
    },
    qtyTotal: {
      ...type.caption,
      fontVariant: ["tabular-nums"],
    },
    listContent: {
      paddingBottom: spacing.xxl,
      flexGrow: 1,
    },
  });
};

export default function SummaryScreenRoute() {
  const { t } = useTranslation();
  return (
    <SectionAccessGate section="picking" message={t("preparacion.pickingNotAllowed")}>
      <SummaryScreen />
    </SectionAccessGate>
  );
}
