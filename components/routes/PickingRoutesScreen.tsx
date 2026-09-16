import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Card,
  Chip,
  Icon,
  ProgressBar,
  Snackbar,
  Text,
  useTheme,
} from "react-native-paper";
import { useNavigationAccess } from "@/hooks/useNavigationAccess";
import { useTranslation } from "@/hooks/useTranslation";
import { preparacionService } from "../../services/preparacionService";
import {
  RutaPreparacion,
  RutaPreparacionStatus,
} from "../../types/preparacion";

const statusConfig: Record<
  RutaPreparacionStatus,
  { color: string; label: string }
> = {
  borrador: { color: "#9E9E9E", label: "Borrador" },
  confirmada: { color: "#1976D2", label: "Confirmada" },
  en_preparacion: { color: "#F9A825", label: "En Preparación" },
  lista_despacho: { color: "#EF6C00", label: "Lista Despacho" },
  en_ruta: { color: "#1F6B54", label: "En Ruta" },
  completada: { color: "#00897B", label: "Completada" },
  cancelada: { color: "#D32F2F", label: "Cancelada" },
};

interface PickingRoutesScreenProps {
  /** Rendered above the title, under the status bar — the Rutas section switcher. */
  headerAccessory?: React.ReactNode;
}

export default function PickingRoutesScreen({ headerAccessory }: PickingRoutesScreenProps) {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { can, loading: accessLoading } = useNavigationAccess();

  const [rutas, setRutas] = useState<RutaPreparacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadRutas = useCallback(async () => {
    try {
      setError("");
      const data = await preparacionService.getRutasPreparacion();
      setRutas(data);
    } catch (err: any) {
      console.error("Error loading rutas:", err);
      setError(
        err.response?.data?.message || err.message || t("preparacion.errorLoading")
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    loadRutas();
  }, [loadRutas]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadRutas();
  }, [loadRutas]);

  const handleRutaPress = (ruta: RutaPreparacion) => {
    // A prepared route opens on the truck load for those who load it; a picker, who does
    // not, stays on the picking list. While the profile is still loading nothing is
    // allowed yet, so the card waits rather than sending a loader to the wrong screen.
    if (accessLoading) return;
    if (ruta.status === "lista_despacho" && can("truckLoading")) {
      router.push(`/preparacion/${ruta.rutaId}/loading` as any);
    } else {
      router.push(`/preparacion/${ruta.rutaId}/picking` as any);
    }
  };

  const getProgress = (ruta: RutaPreparacion) =>
    ruta.totalProductos > 0
      ? ruta.productosPreparados / ruta.totalProductos
      : 0;

  const renderRutaCard = (ruta: RutaPreparacion) => {
    const status = statusConfig[ruta.status] ?? statusConfig.borrador;
    const progress = getProgress(ruta);

    return (
      <TouchableOpacity
        key={ruta.rutaId}
        onPress={() => handleRutaPress(ruta)}
        activeOpacity={0.7}
        style={styles.cardTouchable}
      >
        <Card elevation={0}
          style={[styles.card, { backgroundColor: theme.colors.surface }]}
        >
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text
                variant="titleMedium"
                style={{ fontWeight: "bold", color: theme.colors.onSurface }}
              >
                {ruta.noRuta}
              </Text>
              <Chip
                style={{ backgroundColor: status.color }}
                textStyle={{ color: "#FFF", fontSize: 11 }}
                compact
              >
                {status.label}
              </Chip>
            </View>

            <View style={styles.cardMeta}>
              <View style={styles.metaItem}>
                <Icon source="truck" size={16} color={theme.colors.onSurfaceVariant} />
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}
                >
                  {ruta.distribuidor}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Icon source="package-variant" size={16} color={theme.colors.onSurfaceVariant} />
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}
                >
                  {ruta.totalPedidos} {t("preparacion.orders")} · {ruta.totalProductos} {t("preparacion.products")}
                </Text>
              </View>
            </View>

            <View style={styles.progressRow}>
              <ProgressBar
                progress={progress}
                color={progress >= 1 ? "#1F6B54" : theme.colors.primary}
                style={styles.progressBar}
              />
              <Text
                variant="bodySmall"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginTop: 4,
                  textAlign: "right",
                }}
              >
                {ruta.productosPreparados}/{ruta.totalProductos} {t("preparacion.prepared")}
              </Text>
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  // Loading skeletons
  if (loading && rutas.length === 0) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={["top", "left", "right"]}
      >
        {headerAccessory}
        <View style={styles.headerContainer}>
          <Text variant="headlineSmall" style={{ fontWeight: "bold" }}>
            📦 {t("preparacion.title")}
          </Text>
        </View>
        {[1, 2, 3].map((i) => (
          <Card elevation={0}
            key={i}
            style={[
              styles.card,
              styles.skeletonCard,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
          >
            <Card.Content>
              <View style={[styles.skeletonLine, { width: "60%" }]} />
              <View style={[styles.skeletonLine, { width: "80%", marginTop: 8 }]} />
              <View style={[styles.skeletonLine, { width: "40%", marginTop: 8 }]} />
            </Card.Content>
          </Card>
        ))}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["top", "left", "right"]}
    >
      {headerAccessory}
      <View style={styles.headerContainer}>
        <Text
          variant="headlineSmall"
          style={{ fontWeight: "bold", color: theme.colors.onBackground }}
        >
          📦 {t("preparacion.title")}
        </Text>
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
        >
          {t("preparacion.subtitle")}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {rutas.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon
              source="package-variant-closed"
              size={64}
              color={theme.colors.onSurfaceVariant}
            />
            <Text
              variant="titleMedium"
              style={{
                color: theme.colors.onSurfaceVariant,
                marginTop: 16,
                textAlign: "center",
              }}
            >
              {t("preparacion.noRoutes")}
            </Text>
          </View>
        ) : (
          rutas.map(renderRutaCard)
        )}
      </ScrollView>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError("")}
        duration={4000}
        action={{
          label: "Reintentar",
          onPress: () => {
            setError("");
            loadRutas();
          },
        }}
      >
        {error}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 100,
  },
  cardTouchable: {
    marginBottom: 12,
  },
  card: {
    borderRadius: 14,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardMeta: {
    gap: 6,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressRow: {
    marginTop: 4,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  skeletonCard: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 4,
    backgroundColor: "#DCE2EA",
  },
});
