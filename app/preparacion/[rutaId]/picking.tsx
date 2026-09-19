import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Snackbar,
  Text,
  useTheme,
} from "react-native-paper";
import { useTranslation } from "@/hooks/useTranslation";
import ProgressHeader from "../../../components/preparacion/ProgressHeader";
import ZoneProductList from "../../../components/preparacion/ZoneProductList";
import { preparacionService } from "../../../services/preparacionService";
import {
  ConsolidadoProducto,
  ConsolidadoResponse,
} from "../../../types/preparacion";
import SectionAccessGate from "../../../components/navigation/SectionAccessGate";

function PickingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { rutaId, confirmedProduct, confirmedQty } = useLocalSearchParams<{
    rutaId: string;
    confirmedProduct?: string;
    confirmedQty?: string;
  }>();
  const numericRutaId = parseInt(rutaId ?? "0", 10);
  const isValidRutaId = Number.isFinite(numericRutaId) && numericRutaId > 0;

  const [data, setData] = useState<ConsolidadoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [pickedQtys, setPickedQtys] = useState<Record<string, number>>({});
  const [confirmedProducts, setConfirmedProducts] = useState<Set<string>>(new Set());

  const loadConsolidado = useCallback(async () => {
    if (!isValidRutaId) {
      setError(t("preparacion.invalidRouteId"));
      setLoading(false);
      return;
    }
    try {
      setError("");
      const response = await preparacionService.getConsolidado(numericRutaId);
      setData(response);
      // Initialize picked quantities to 0 for new products only — preserve existing counts
      setPickedQtys((prev) => {
        const next = { ...prev };
        response.zonas.forEach((z) =>
          z.productos.forEach((p) => {
            if (!(p.codigoProducto in next)) {
              next[p.codigoProducto] = 0;
            }
          })
        );
        return next;
      });
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          t("preparacion.errorLoadingPicking")
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [numericRutaId, isValidRutaId, t]);

  useEffect(() => {
    loadConsolidado();
  }, [loadConsolidado]);

  // Handle confirmed product returning from confirmar-producto screen
  useEffect(() => {
    if (confirmedProduct) {
      setConfirmedProducts((prev) => new Set(prev).add(confirmedProduct));
      if (confirmedQty) {
        setPickedQtys((prev) => ({
          ...prev,
          [confirmedProduct]: parseFloat(confirmedQty) || 0,
        }));
      }
      setSuccess(`${confirmedProduct} — ${t("preparacion.confirmed")}`);
    }
  }, [confirmedProduct, confirmedQty]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadConsolidado();
  }, [loadConsolidado]);

  const handleProductPress = useCallback(
    (producto: ConsolidadoProducto) => {
      if (confirmedProducts.has(producto.codigoProducto)) return;

      // Navigate to confirmar-producto screen for qty entry and confirmation
      router.push({
        pathname: "/preparacion/[rutaId]/confirmar-producto" as any,
        params: {
          rutaId: rutaId ?? "0",
          codigoProducto: producto.codigoProducto,
          descripcion: producto.nombreProducto,
          cantidadTotal: producto.cantidadTotal.toString(),
          unidad: producto.unidad ?? "",
        },
      });
    },
    [confirmedProducts, rutaId, router]
  );


  const totalProductos = useMemo(
    () => data?.zonas.reduce((sum, z) => sum + z.productos.length, 0) ?? 0,
    [data]
  );

  const productosPreparados = confirmedProducts.size;

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
          {t("preparacion.loadingPicking")}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["left", "right"]}
    >
      <ZoneProductList
        zonas={data?.zonas ?? []}
        pickedQtys={pickedQtys}
        confirmedProducts={confirmedProducts}
        confirmingZone={null}
        onProductPress={handleProductPress}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={
          <ProgressHeader
            totalProductos={totalProductos}
            productosPreparados={productosPreparados}
            noRuta={data?.noRuta ?? `Ruta ${rutaId}`}
          />
        }
      />

      <Snackbar
        visible={!!error}
        onDismiss={() => setError("")}
        duration={4000}
        action={{
          label: t("common.retry"),
          onPress: () => {
            setError("");
            loadConsolidado();
          },
        }}
      >
        {error}
      </Snackbar>

      <Snackbar
        visible={!!success}
        onDismiss={() => setSuccess("")}
        duration={2500}
      >
        {success}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default function PickingScreenRoute() {
  const { t } = useTranslation();
  return (
    <SectionAccessGate section="picking" message={t("preparacion.pickingNotAllowed")}>
      <PickingScreen />
    </SectionAccessGate>
  );
}
