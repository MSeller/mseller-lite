import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import {
  Card,
  Chip,
  Divider,
  IconButton,
  ProgressBar,
  Snackbar,
  Text,
  useTheme,
} from "react-native-paper";
import { CustomTheme } from "../../constants/Theme";
import { useTranslation } from "../../hooks/useTranslation";
import { inventoryService } from "../../services/inventoryService";
import {
  EstadoConteoDetalle,
  InventarioConteo,
  ProductoConteo,
  ResumenConteo,
} from "../../types/inventory";

interface InventoryProgressScreenProps {
  conteo: InventarioConteo;
  onNavigateBack: () => void;
}

const InventoryProgressScreen: React.FC<InventoryProgressScreenProps> = ({
  conteo,
  onNavigateBack,
}) => {
  const { t } = useTranslation();
  const theme = useTheme() as CustomTheme;

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<ResumenConteo | null>(null);
  const [products, setProducts] = useState<ProductoConteo[]>([]);
  const [filterStatus, setFilterStatus] = useState<EstadoConteoDetalle | "all">(
    "all"
  );

  const loadData = useCallback(async () => {
    try {
      setError("");

      const [summaryData, productsData] = await Promise.all([
        inventoryService.getResumenConteo(conteo.id),
        inventoryService.getProductosConteo(conteo.id),
      ]);

      setSummary(summaryData);
      setProducts(productsData);
    } catch (err: any) {
      console.error("Error loading progress data:", err);
      setError(err.message || t("errors.genericError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [conteo.id, t]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getStatusColor = (estado: EstadoConteoDetalle) => {
    switch (estado) {
      case EstadoConteoDetalle.Contado:
        return theme.colors.primary;
      case EstadoConteoDetalle.Verificado:
        return theme.colors.secondary;
      case EstadoConteoDetalle.Discrepancia:
        return theme.colors.error;
      default:
        return theme.colors.outline;
    }
  };

  const getStatusText = (estado: EstadoConteoDetalle) => {
    switch (estado) {
      case EstadoConteoDetalle.Pendiente:
        return "Pendiente";
      case EstadoConteoDetalle.Contado:
        return "Contado";
      case EstadoConteoDetalle.Verificado:
        return "Verificado";
      case EstadoConteoDetalle.Discrepancia:
        return "Discrepancia";
      default:
        return estado;
    }
  };

  const getFilteredProducts = () => {
    if (filterStatus === "all") return products;
    return products.filter((p) => (p as any).estado === filterStatus);
  };

  const filteredProducts = getFilteredProducts();

  const statusCounts = {
    pending: products.filter(
      (p) => (p as any).estado === EstadoConteoDetalle.Pendiente
    ).length,
    counted: products.filter(
      (p) => (p as any).estado === EstadoConteoDetalle.Contado
    ).length,
    verified: products.filter(
      (p) => (p as any).estado === EstadoConteoDetalle.Verificado
    ).length,
    discrepancy: products.filter(
      (p) => (p as any).estado === EstadoConteoDetalle.Discrepancia
    ).length,
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.header}>
        <IconButton icon="arrow-left" size={24} onPress={onNavigateBack} />
        <Text
          variant="titleLarge"
          style={{ color: theme.colors.primary, flex: 1 }}
        >
          {t("inventory.countProgress")}
        </Text>
        <IconButton
          icon="refresh"
          size={24}
          onPress={handleRefresh}
          disabled={loading}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Summary Card */}
        {summary && (
          <Card elevation={0}
            style={[styles.card, { backgroundColor: theme.colors.surface }]}
          >
            <Card.Content>
              <Text
                variant="titleLarge"
                style={{ color: theme.colors.primary, marginBottom: 16 }}
              >
                Resumen General
              </Text>

              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text variant="headlineMedium" style={styles.summaryNumber}>
                    {summary.totalProductosContados +
                      summary.productosPendientes}
                  </Text>
                  <Text variant="bodyMedium" style={styles.summaryLabel}>
                    {t("inventory.totalProducts")}
                  </Text>
                </View>

                <View style={styles.summaryItem}>
                  <Text
                    variant="headlineMedium"
                    style={[
                      styles.summaryNumber,
                      { color: theme.colors.primary },
                    ]}
                  >
                    {summary.totalProductosContados}
                  </Text>
                  <Text variant="bodyMedium" style={styles.summaryLabel}>
                    {t("inventory.completedProducts")}
                  </Text>
                </View>

                <View style={styles.summaryItem}>
                  <Text
                    variant="headlineMedium"
                    style={[
                      styles.summaryNumber,
                      { color: theme.colors.outline },
                    ]}
                  >
                    {summary.productosPendientes}
                  </Text>
                  <Text variant="bodyMedium" style={styles.summaryLabel}>
                    {t("inventory.pendingProducts")}
                  </Text>
                </View>

                <View style={styles.summaryItem}>
                  <Text
                    variant="headlineMedium"
                    style={[
                      styles.summaryNumber,
                      { color: theme.colors.error },
                    ]}
                  >
                    {summary.discrepanciasEncontradas}
                  </Text>
                  <Text variant="bodyMedium" style={styles.summaryLabel}>
                    {t("inventory.discrepancy")}
                  </Text>
                </View>
              </View>

              <Divider style={styles.divider} />

              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text
                    variant="bodyMedium"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    Progreso Total
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={{ color: theme.colors.primary, fontWeight: "bold" }}
                  >
                    {summary.porcentajeCompletado?.toFixed(1)}%
                  </Text>
                </View>
                <ProgressBar
                  progress={summary.porcentajeCompletado / 100}
                  color={theme.colors.primary}
                  style={styles.progressBar}
                />
              </View>

              {/* {summary.valorTotalDiscrepancias !== 0 && (
                <View style={styles.discrepancyAlert}>
                  <Text
                    variant="bodyMedium"
                    style={{ color: theme.colors.error, fontWeight: "bold" }}
                  >
                    Valor Total de Discrepancias: $
                    {summary.valorTotalDiscrepancias?.toFixed(2)}
                  </Text>
                </View>
              )} */}
            </Card.Content>
          </Card>
        )}

        {/* Status Filter */}
        <Card elevation={0} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Filtrar por Estado
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterChips}>
                <Chip
                  selected={filterStatus === "all"}
                  onPress={() => setFilterStatus("all")}
                  style={styles.filterChip}
                >
                  Todos ({products.length})
                </Chip>
                <Chip
                  selected={filterStatus === EstadoConteoDetalle.Pendiente}
                  onPress={() => setFilterStatus(EstadoConteoDetalle.Pendiente)}
                  style={styles.filterChip}
                >
                  Pendientes ({statusCounts.pending})
                </Chip>
                <Chip
                  selected={filterStatus === EstadoConteoDetalle.Contado}
                  onPress={() => setFilterStatus(EstadoConteoDetalle.Contado)}
                  style={styles.filterChip}
                >
                  Contados ({statusCounts.counted})
                </Chip>
                <Chip
                  selected={filterStatus === EstadoConteoDetalle.Discrepancia}
                  onPress={() =>
                    setFilterStatus(EstadoConteoDetalle.Discrepancia)
                  }
                  style={styles.filterChip}
                >
                  Discrepancias ({statusCounts.discrepancy})
                </Chip>
              </View>
            </ScrollView>
          </Card.Content>
        </Card>

        {/* Products List */}
        <Card elevation={0} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Productos ({filteredProducts.length})
            </Text>

            {filteredProducts.map((product, index) => (
              <View key={product.codigo} style={styles.productItem}>
                <View style={styles.productInfo}>
                  <Text variant="bodyMedium" style={styles.productCode}>
                    {product.codigo}
                  </Text>
                  <Text variant="bodyMedium" style={styles.productName}>
                    {product.nombre}
                  </Text>

                  {product.ubicacionDetallada && (
                    <Text variant="bodySmall" style={styles.location}>
                      📍 {inventoryService.formatProductLocation(product)}
                    </Text>
                  )}

                  <View style={styles.quantityInfo}>
                    {(product as any).cantidadSnapshot !== undefined && (
                      <Text variant="bodySmall" style={styles.quantityText}>
                        Esperado: {(product as any).cantidadSnapshot}
                      </Text>
                    )}
                    {(product as any).cantidadContada !== undefined && (
                      <Text variant="bodySmall" style={styles.quantityText}>
                        Contado: {(product as any).cantidadContada}
                      </Text>
                    )}
                    {(product as any).cantidadSnapshot !== undefined &&
                      (product as any).cantidadContada !== undefined &&
                      (product as any).cantidadSnapshot !==
                        (product as any).cantidadContada && (
                        <Text
                          variant="bodySmall"
                          style={[
                            styles.quantityText,
                            { color: theme.colors.error, fontWeight: "bold" },
                          ]}
                        >
                          Diferencia:{" "}
                          {(product as any).cantidadContada -
                            (product as any).cantidadSnapshot}
                        </Text>
                      )}
                  </View>
                </View>

                <Chip
                  style={{
                    backgroundColor: getStatusColor((product as any).estado),
                  }}
                  textStyle={{ color: theme.colors.onPrimary }}
                >
                  {getStatusText((product as any).estado)}
                </Chip>
              </View>
            ))}

            {filteredProducts.length === 0 && (
              <View style={styles.emptyState}>
                <Text
                  variant="bodyMedium"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  No hay productos con el estado seleccionado
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
      </ScrollView>

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  summaryItem: {
    width: "48%",
    alignItems: "center",
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#EDF1F6",
    borderRadius: 8,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    textAlign: "center",
    opacity: 0.7,
  },
  divider: {
    marginVertical: 16,
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
    borderRadius: 4,
  },
  discrepancyAlert: {
    backgroundColor: "#F8DEDC",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  filterChips: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    marginRight: 8,
  },
  productItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productCode: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#5C6773",
    marginBottom: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  location: {
    fontSize: 12,
    fontStyle: "italic",
    marginBottom: 8,
    opacity: 0.7,
  },
  quantityInfo: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quantityText: {
    fontSize: 12,
    backgroundColor: "#EDF1F6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
  },
});

export default InventoryProgressScreen;
