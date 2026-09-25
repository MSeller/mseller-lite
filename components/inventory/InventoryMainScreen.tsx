import { isAxiosError } from "axios";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Chip,
  Divider,
  FAB,
  Icon,
  IconButton,
  ProgressBar,
  Snackbar,
  Text,
  useTheme,
} from "react-native-paper";
import { CustomTheme } from "../../constants/Theme";
import { useUser } from "../../contexts/UserContext";
import { useTranslation } from "../../hooks/useTranslation";
import {
  inventoryService,
  offlineManager,
} from "../../services/inventoryService";
import {
  EstadoConteo,
  InventarioConteo,
  ResumenConteo,
} from "../../types/inventory";

interface InventoryMainScreenProps {
  onNavigateToCount: (conteo: InventarioConteo) => void;
  onNavigateToProgress: (conteo: InventarioConteo) => void;
  onNavigateToDemo?: () => void; // Add optional demo navigation
}

const InventoryMainScreen: React.FC<InventoryMainScreenProps> = ({
  onNavigateToCount,
  onNavigateToProgress,
  onNavigateToDemo,
}) => {
  const { userProfile } = useUser();
  const { t } = useTranslation();
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeCount, setActiveCount] = useState<InventarioConteo | null>(null);
  const [allCounts, setAllCounts] = useState<InventarioConteo[]>([]);
  const [countSummary, setCountSummary] = useState<ResumenConteo | null>(null);
  const [offlineOperationsCount, setOfflineOperationsCount] = useState(0);

  // Get warehouse ID from user profile
  const warehouseId = userProfile?.warehouse
    ? inventoryService.getWarehouseId(userProfile.warehouse)
    : null;

  const loadData = useCallback(async () => {
    if (!warehouseId) return;

    try {
      setError("");

      // Load active count and all counts in parallel
      const [activeCountData, allCountsData] = await Promise.all([
        inventoryService.getConteoActivo(warehouseId),
        inventoryService.getConteosActivos(warehouseId),
      ]);

      setActiveCount(activeCountData);
      setAllCounts(allCountsData);

      // Load summary if there's an active count
      if (activeCountData) {
        const summary = await inventoryService.getResumenConteo(
          activeCountData.id
        );
        setCountSummary(summary);
      } else {
        setCountSummary(null);
      }

      // Update offline operations count
      const offlineCount = await offlineManager.getPendingOperationsCount();
      setOfflineOperationsCount(offlineCount);
    } catch (err: any) {
      if (isAxiosError(err)) {
        console.error("Axios error loading inventory data:", err.request);
      }
      console.error("Error loading inventory data:", err);
      setError(
        err.response?.data?.message || err.message || t("errors.genericError")
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [warehouseId, t]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleSyncOfflineData = async () => {
    if (offlineOperationsCount === 0) return;

    setLoading(true);
    setError("");

    try {
      const result = await offlineManager.syncPendingOperations(
        inventoryService
      );

      if (result.success > 0) {
        setSuccess(
          t("inventory.syncSuccess") +
            ` (${result.success} ${t("common.success").toLowerCase()})`
        );
        setOfflineOperationsCount(0);
        // Reload data to reflect changes
        await loadData();
      }

      if (result.failed > 0) {
        setError(
          `${t("inventory.syncFailed")}: ${result.failed} operations failed`
        );
      }
    } catch (err: any) {
      console.error("Error syncing offline data:", err);
      setError(err.message || t("errors.networkError"));
    } finally {
      setLoading(false);
    }
  };

  // Status chips: tinted container with its own text tone, so they read in both modes.
  const getCountStatusTone = (estado: EstadoConteo) => {
    const { status } = theme.custom;
    switch (estado) {
      case EstadoConteo.EnProgreso:
        return { container: theme.colors.primaryContainer, onContainer: theme.colors.onPrimaryContainer };
      case EstadoConteo.Completado:
        return status.positive;
      case EstadoConteo.Reconciliado:
        return { container: theme.colors.tertiaryContainer, onContainer: theme.colors.onTertiaryContainer };
      case EstadoConteo.Planificado:
        return status.neutral;
      default:
        return status.negative;
    }
  };

  const getCountStatusColor = (estado: EstadoConteo) => getCountStatusTone(estado).container;

  const getCountStatusTextColor = (estado: EstadoConteo) => getCountStatusTone(estado).onContainer;

  const getCountStatusText = (estado: EstadoConteo) => {
    switch (estado) {
      case EstadoConteo.Planificado:
        return "Planificado";
      case EstadoConteo.EnProgreso:
        return "En Progreso";
      case EstadoConteo.Completado:
        return "Completado";
      case EstadoConteo.Reconciliado:
        return "Reconciliado";
      case EstadoConteo.Cancelado:
        return "Cancelado";
      default:
        return estado;
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!userProfile) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text variant="titleLarge">{t("common.loading")}</Text>
      </View>
    );
  }

  if (!warehouseId) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text variant="titleLarge" style={{ color: theme.colors.error }}>
          {t("errors.genericError")}
        </Text>
        <Text variant="bodyMedium">Invalid warehouse configuration</Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <Card elevation={0} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={styles.header}>
              <View style={styles.headerInfo}>
                <Text
                  variant="titleLarge"
                  style={{ color: theme.colors.primary }}
                >
                  {t("inventory.inventoryCount")} {t("inventory.mobile")}
                </Text>
                <Text
                  variant="bodyMedium"
                  style={{ color: theme.colors.onSurface }}
                >
                  {t("inventory.warehouse")}: {userProfile.warehouse}
                </Text>
              </View>
              <View style={styles.headerActions}>
                {/* {onNavigateToDemo && (
                  <IconButton
                    icon="information"
                    size={24}
                    onPress={onNavigateToDemo}
                    iconColor={theme.colors.secondary}
                  />
                )} */}
                <IconButton
                  icon="refresh"
                  size={24}
                  onPress={handleRefresh}
                  disabled={loading}
                />
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Offline Operations Alert */}
        {offlineOperationsCount > 0 && (
          <Card elevation={0} style={[styles.card, styles.warningCard]}>
            <Card.Content>
              <View style={styles.offlineAlert}>
                <View style={styles.offlineInfo}>
                  <Text
                    variant="titleLarge"
                    style={{ color: theme.colors.secondary }}
                  >
                    {t("inventory.offlineOperations")}
                  </Text>
                  <Text variant="bodyMedium">
                    {offlineOperationsCount} operations pending sync
                  </Text>
                </View>
                <Button
                  mode="contained"
                  onPress={handleSyncOfflineData}
                  loading={loading}
                  disabled={loading}
                >
                  {t("inventory.syncOfflineData")}
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Active Count Section */}
        {activeCount ? (
          <Card elevation={0}
            style={[styles.card, { backgroundColor: theme.colors.surface }]}
          >
            <Card.Content>
              <View style={styles.activeCountHeader}>
                <Text
                  variant="titleLarge"
                  style={{ color: theme.colors.primary }}
                >
                  {t("inventory.activeCount")}
                </Text>
                <View
                  style={[
                    styles.customChip,
                    {
                      backgroundColor: getCountStatusColor(activeCount.estado),
                    },
                  ]}
                >
                  <Icon
                    source="clipboard-check"
                    size={16}
                    color={getCountStatusTextColor(activeCount.estado)}
                  />
                  <Text
                    variant="labelMedium"
                    style={{
                      color: getCountStatusTextColor(activeCount.estado),
                      marginLeft: 6,
                    }}
                  >
                    {getCountStatusText(activeCount.estado)}
                  </Text>
                </View>
              </View>

              <Text variant="bodyMedium" style={styles.countDescription}>
                {activeCount.descripcion}
              </Text>

              {countSummary && (
                <View style={styles.progressSection}>
                  <View style={styles.progressHeader}>
                    <Text
                      variant="bodyMedium"
                      style={{ color: theme.colors.onSurfaceVariant }}
                    >
                      {t("inventory.countProgress")}
                    </Text>
                    <Text
                      variant="bodyMedium"
                      style={{ color: theme.colors.primary }}
                    >
                      {countSummary.productosPendientes} /{" "}
                      {countSummary.totalProductosContados +
                        countSummary.productosPendientes}
                    </Text>
                  </View>
                  <ProgressBar
                    progress={countSummary.porcentajeCompletado / 100}
                    color={theme.colors.primary}
                    style={styles.progressBar}
                  />
                  <Text variant="bodyMedium" style={styles.progressText}>
                    {countSummary.porcentajeCompletado.toFixed(1)}%{" "}
                    {t("common.completed")}
                  </Text>
                </View>
              )}

              <Divider style={styles.divider} />

              <View style={styles.actionButtons}>
                <Button
                  mode="contained"
                  icon="barcode-scan"
                  onPress={() => onNavigateToCount(activeCount)}
                  style={styles.actionButton}
                  disabled={activeCount.estado === EstadoConteo.Completado}
                >
                  {t("inventory.startCounting")}
                </Button>
                <Button
                  mode="outlined"
                  icon="chart-line"
                  onPress={() => onNavigateToProgress(activeCount)}
                  style={styles.actionButton}
                >
                  {t("inventory.countProgress")}
                </Button>
              </View>
            </Card.Content>
          </Card>
        ) : (
          <Card elevation={0}
            style={[styles.card, { backgroundColor: theme.colors.surface }]}
          >
            <Card.Content style={styles.noActiveCount}>
              <Text
                variant="titleLarge"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {t("inventory.noActiveCount")}
              </Text>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                No hay conteos activos en este almacén
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Recent Counts */}
        {allCounts.length > 0 && (
          <Card elevation={0}
            style={[styles.card, { backgroundColor: theme.colors.surface }]}
          >
            <Card.Content>
              <Text
                variant="titleLarge"
                style={{ color: theme.colors.onSurface, marginBottom: 16 }}
              >
                Conteos Recientes
              </Text>
              {allCounts.slice(0, 5).map((conteo) => (
                <View key={conteo.id} style={styles.countItem}>
                  <View style={styles.countItemInfo}>
                    <Text variant="bodyMedium" style={{ fontWeight: "bold" }}>
                      {conteo.descripcion}
                    </Text>
                    <Text
                      variant="bodyMedium"
                      style={{ color: theme.colors.onSurfaceVariant }}
                    >
                      {new Date(conteo.fechaCreacion).toLocaleDateString()}
                    </Text>
                  </View>
                  <Chip
                    style={{
                      backgroundColor: getCountStatusColor(conteo.estado),
                    }}
                    textStyle={{
                      color: getCountStatusTextColor(conteo.estado),
                    }}
                  >
                    {getCountStatusText(conteo.estado)}
                  </Chip>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      {activeCount && activeCount.estado === EstadoConteo.EnProgreso && (
        <FAB
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          icon="barcode-scan"
          onPress={() => onNavigateToCount(activeCount)}
          label={t("inventory.countProduct")}
        />
      )}

      {/* Snackbars */}
      <Snackbar
        visible={!!error}
        onDismiss={() => setError("")}
        duration={4000}
        action={{
          label: t("common.retry"),
          onPress: () => {
            setError("");
            loadData();
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
    </View>
  );
};

const createStyles = (theme: CustomTheme) => {
  const { colors, radius, type } = theme.custom;
  return StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100, // Space for FAB
  },
  card: {
    marginBottom: 16,
    borderRadius: radius.container,
  },
  warningCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.custom.status.warning.base,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerInfo: {
    flex: 1,
  },
  offlineAlert: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  offlineInfo: {
    flex: 1,
    marginRight: 16,
  },
  activeCountHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  countDescription: {
    marginBottom: 16,
    fontStyle: "italic",
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4, // half the bar's height
    marginBottom: 4,
  },
  progressText: {
    textAlign: "center",
    fontSize: type.overline.fontSize,
  },
  divider: {
    marginVertical: 16,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  noActiveCount: {
    alignItems: "center",
    paddingVertical: 24,
  },
  countItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: theme.custom.hairline,
    borderBottomColor: colors.hairline,
  },
  countItemInfo: {
    flex: 1,
  },
  customChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.tag,
    alignSelf: "flex-start",
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0,
  },
  });
};

export default InventoryMainScreen;
