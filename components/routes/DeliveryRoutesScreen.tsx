import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
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
import type { CustomTheme } from "@/constants/Theme";
import { useTranslation } from "@/hooks/useTranslation";
import { entregaService } from "../../services/entregaService";
import { EntregaRuta } from "../../types/entrega";
import { vehiculoLabel } from "../../utils/mapLinks";
import { RUTA_STATUS_TONE } from "../../utils/routeStatus";

interface DeliveryRoutesScreenProps {
  /** Rendered above the title, under the status bar — the Rutas section switcher. */
  headerAccessory?: React.ReactNode;
}

export default function DeliveryRoutesScreen({ headerAccessory }: DeliveryRoutesScreenProps) {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const { t } = useTranslation();

  const [rutas, setRutas] = useState<EntregaRuta[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadRutas = useCallback(async () => {
    try {
      setError("");
      const data = await entregaService.getRutas();
      // Active route first, then most recent.
      const items = [...data.items].sort(
        (a, b) => Number(b.esActiva) - Number(a.esActiva)
      );
      setRutas(items);
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || t("entrega.errorLoading")
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      loadRutas();
    }, [loadRutas])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadRutas();
  }, [loadRutas]);

  const renderCard = (ruta: EntregaRuta) => {
    const tone = theme.custom.status[RUTA_STATUS_TONE[ruta.status] ?? "neutral"];
    const progress =
      ruta.totalFacturas > 0 ? ruta.facturasEntregadas / ruta.totalFacturas : 0;
    const veh = [vehiculoLabel(ruta.vehiculoTipo), ruta.vehiculoPlaca]
      .filter(Boolean)
      .join(" · ");

    return (
      <TouchableOpacity
        key={ruta.rutaId}
        onPress={() => router.push(`/entrega/${ruta.rutaId}` as any)}
        activeOpacity={0.7}
        style={styles.cardTouchable}
      >
        <Card elevation={0}
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderLeftWidth: ruta.esActiva ? 4 : 0,
              borderLeftColor: theme.custom.status.positive.base,
            },
          ]}
        >
          <Card.Content>
            <View style={styles.cardHeader}>
              <View style={styles.titleRow}>
                <Text
                  variant="titleMedium"
                  style={{ fontWeight: "bold", color: theme.colors.onSurface }}
                >
                  {ruta.noRuta}
                </Text>
                {ruta.esActiva && (
                  <Chip
                    compact
                    style={styles.activeChip}
                    textStyle={styles.activeChipText}
                    icon="truck-fast"
                  >
                    {t("entrega.active")}
                  </Chip>
                )}
              </View>
              <Chip
                style={{ backgroundColor: tone.container }}
                textStyle={[styles.chipText, { color: tone.onContainer }]}
                compact
              >
                {t(`entrega.status.${ruta.status}`)}
              </Chip>
            </View>

            {!!veh && (
              <View style={styles.metaItem}>
                <Icon source="truck" size={16} color={theme.colors.onSurfaceVariant} />
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}
                >
                  {veh}
                </Text>
              </View>
            )}

            <View style={styles.metaItem}>
              <Icon source="file-document-outline" size={16} color={theme.colors.onSurfaceVariant} />
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}
              >
                {ruta.facturasEntregadas}/{ruta.totalFacturas}{" "}
                {t("entrega.delivered")} · {ruta.facturasPendientes}{" "}
                {t("entrega.pending")}
              </Text>
            </View>

            <ProgressBar
              progress={progress}
              color={progress >= 1 ? theme.custom.status.positive.base : theme.colors.primary}
              style={styles.progressBar}
            />
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["top", "left", "right"]}
    >
      {headerAccessory}
      <View style={styles.header}>
        <Text
          variant="headlineSmall"
          style={{ fontWeight: "bold", color: theme.colors.onBackground }}
        >
          🚚 {t("entrega.title")}
        </Text>
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
        >
          {t("entrega.subtitle")}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {!loading && rutas.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon source="truck-check-outline" size={64} color={theme.colors.onSurfaceVariant} />
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.onSurfaceVariant, marginTop: 16, textAlign: "center" }}
            >
              {t("entrega.noRoutes")}
            </Text>
          </View>
        ) : (
          rutas.map(renderCard)
        )}
      </ScrollView>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError("")}
        duration={4000}
        action={{ label: t("common.retry"), onPress: () => { setError(""); loadRutas(); } }}
      >
        {error}
      </Snackbar>
    </SafeAreaView>
  );
}

const PROGRESS_BAR_HEIGHT = 6;

const createStyles = (theme: CustomTheme) => {
  const { radius, type, status } = theme.custom;
  return StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
    scrollContent: { padding: 16, paddingTop: 0, paddingBottom: 100 },
    cardTouchable: { marginBottom: 12 },
    card: { borderRadius: radius.container },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    titleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
    chipText: { fontSize: type.caption.fontSize },
    activeChip: { backgroundColor: status.positive.container },
    activeChipText: { color: status.positive.onContainer, fontSize: type.caption.fontSize },
    metaItem: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
    progressBar: { height: PROGRESS_BAR_HEIGHT, borderRadius: PROGRESS_BAR_HEIGHT / 2, marginTop: 4 },
    emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 64 },
  });
};
