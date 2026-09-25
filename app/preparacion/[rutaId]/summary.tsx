import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshControl,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Button,
  Card,
  Divider,
  Icon,
  Snackbar,
  Text,
  useTheme,
} from "react-native-paper";
import type { CustomTheme } from "@/constants/Theme";
import { useTranslation } from "@/hooks/useTranslation";
import { preparacionService } from "../../../services/preparacionService";
import {
  SummaryCliente,
  SummaryClienteProducto,
  SummaryResponse,
  SummaryZona,
} from "../../../types/preparacion";
import SectionAccessGate from "../../../components/navigation/SectionAccessGate";

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
  const styles = useMemo(() => createStyles(theme), [theme]);
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

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: theme.colors.background }]}
      >
        <ActivityIndicator size="large" />
        <Text
          variant="bodyLarge"
          style={{ marginTop: 16, color: theme.colors.onSurfaceVariant }}
        >
          {t("preparacion.summaryLoading")}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["left", "right"]}
    >
      {/* Tab selector */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "zones" && {
              borderBottomColor: theme.colors.primary,
              borderBottomWidth: 3,
            },
          ]}
          onPress={() => setActiveTab("zones")}
          activeOpacity={0.7}
        >
          <Icon
            source="map-marker"
            size={18}
            color={
              activeTab === "zones"
                ? theme.colors.primary
                : theme.colors.onSurfaceVariant
            }
          />
          <Text
            variant="labelLarge"
            style={{
              color:
                activeTab === "zones"
                  ? theme.colors.primary
                  : theme.colors.onSurfaceVariant,
              fontWeight: activeTab === "zones" ? "bold" : "normal",
              marginLeft: 6,
            }}
          >
            {t("preparacion.zoneBreakdown")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "customers" && {
              borderBottomColor: theme.colors.primary,
              borderBottomWidth: 3,
            },
          ]}
          onPress={() => setActiveTab("customers")}
          activeOpacity={0.7}
        >
          <Icon
            source="account-group"
            size={18}
            color={
              activeTab === "customers"
                ? theme.colors.primary
                : theme.colors.onSurfaceVariant
            }
          />
          <Text
            variant="labelLarge"
            style={{
              color:
                activeTab === "customers"
                  ? theme.colors.primary
                  : theme.colors.onSurfaceVariant,
              fontWeight: activeTab === "customers" ? "bold" : "normal",
              marginLeft: 6,
            }}
          >
            {t("preparacion.customerBreakdown")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Section list */}
      <SectionList<SummaryRow, SummarySection>
        sections={activeSections}
        keyExtractor={(item, index) => item.codigoProducto + index}
        renderSectionHeader={({ section }) => (
          <View
            style={[
              styles.sectionHeader,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
          >
            <Text
              variant="titleMedium"
              style={{ fontWeight: "bold", color: theme.colors.onSurface }}
            >
              {activeTab === "zones" ? `🗺️ ${t("preparacion.zone")} ${section.title}` : `👤 ${section.title}`}
            </Text>
          </View>
        )}
        renderItem={({ item }) => {
          if (activeTab === "zones" && item.cantidadSolicitada != null) {
            const match = item.cantidadConfirmada === item.cantidadSolicitada;
            return (
              <View
                style={[
                  styles.productRow,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <View style={styles.productInfo}>
                  <Text
                    variant="bodyLarge"
                    style={{ fontWeight: "600", color: theme.colors.onSurface }}
                    numberOfLines={2}
                  >
                    {item.descripcion}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    {item.codigoProducto} · {item.unidad}
                  </Text>
                </View>
                <View style={styles.productQty}>
                  <Text
                    style={[
                      styles.qtyText,
                      {
                        color: match
                          ? theme.custom.status.positive.base
                          : theme.custom.status.warning.base,
                      },
                    ]}
                  >
                    {item.cantidadConfirmada}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    / {item.cantidadSolicitada}
                  </Text>
                  {match && (
                    <Icon
                      source="check-circle"
                      size={18}
                      color={theme.custom.status.positive.base}
                    />
                  )}
                </View>
              </View>
            );
          }
          // Customer tab
          return (
            <View
              style={[
                styles.productRow,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <View style={styles.productInfo}>
                <Text
                  variant="bodyLarge"
                  style={{ fontWeight: "600", color: theme.colors.onSurface }}
                  numberOfLines={2}
                >
                  {item.descripcion}
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  {item.codigoProducto}
                </Text>
              </View>
              <View style={styles.qtyContainer}>
                <Text style={[styles.qtyText, {
                  color: item.cantidadConfirmada === item.cantidadSolicitada
                    ? theme.colors.primary
                    : theme.colors.error
                }]}>
                  {item.cantidadConfirmada}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  / {item.cantidadSolicitada}
                </Text>
              </View>
            </View>
          );
        }}
        stickySectionHeadersEnabled
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <Divider />}
        ListEmptyComponent={
          <Card elevation={0} style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}>
            <Card.Content style={styles.emptyContent}>
              <Icon
                source="clipboard-text-outline"
                size={48}
                color={theme.colors.onSurfaceVariant}
              />
              <Text
                variant="bodyLarge"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginTop: 12,
                  textAlign: "center",
                }}
              >
                {t("preparacion.noSummaryData")}
              </Text>
            </Card.Content>
          </Card>
        }
      />

      {/* Bottom action bar */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.custom.colors.hairline,
          },
        ]}
      >
        <Button
          mode="contained"
          onPress={handleCompletePreparation}
          disabled={completing}
          loading={completing}
          icon="check-all"
          style={styles.completeButton}
          contentStyle={styles.completeButtonContent}
        >
          {completing
            ? t("preparacion.completingPreparation")
            : t("preparacion.completePreparation")}
        </Button>
      </View>

      <Snackbar
        visible={!!error}
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

const createStyles = (theme: CustomTheme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    minHeight: 48,
  },
  navButton: {
    minHeight: 48,
  },
  navButtonContent: {
    minHeight: 48,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: theme.custom.hairline,
    borderBottomColor: theme.custom.colors.hairline,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    minHeight: 48,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  productRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productQty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  qtyContainer: {
    alignItems: "flex-end" as const,
  },
  qtyText: {
    ...theme.custom.type.figure(22),
  },
  listContent: {
    paddingBottom: 140,
  },
  emptyCard: {
    margin: 16,
  },
  emptyContent: {
    alignItems: "center",
    paddingVertical: 32,
  },
  bottomBar: {
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: theme.custom.hairline,
  },
  completeButton: {
    minHeight: 48,
  },
  completeButtonContent: {
    minHeight: 48,
  },
});

export default function SummaryScreenRoute() {
  const { t } = useTranslation();
  return (
    <SectionAccessGate section="picking" message={t("preparacion.pickingNotAllowed")}>
      <SummaryScreen />
    </SectionAccessGate>
  );
}
