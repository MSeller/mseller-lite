import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
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
import PreparacionCerradaBanner from "../../../components/preparacion/PreparacionCerradaBanner";
import ProgressHeader from "../../../components/preparacion/ProgressHeader";
import ZoneProductList from "../../../components/preparacion/ZoneProductList";
import { preparacionService } from "../../../services/preparacionService";
import {
  ConsolidadoProducto,
  ConsolidadoResponse,
} from "../../../types/preparacion";
import SectionAccessGate from "../../../components/navigation/SectionAccessGate";
import { preparacionAbierta } from "../../../utils/routeLoading";

function PickingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { rutaId, confirmedProduct, confirmedQty, preparacionCerrada } = useLocalSearchParams<{
    rutaId: string;
    confirmedProduct?: string;
    confirmedQty?: string;
    /** Set (to a timestamp) by confirmar-producto when the backend answered 409 PREPARACION_CERRADA. */
    preparacionCerrada?: string;
  }>();
  const numericRutaId = parseInt(rutaId ?? "0", 10);
  const isValidRutaId = Number.isFinite(numericRutaId) && numericRutaId > 0;

  const [data, setData] = useState<ConsolidadoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // A 409 PREPARACION_CERRADA closes picking even if the consolidado predates the status field.
  const [cerradaPorServidor, setCerradaPorServidor] = useState(false);

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
      const productos = response.zonas.flatMap((z) => z.productos);
      // Confirmations live on the backend (MSE-257): a product it reports as confirmed shows
      // its prepared quantity. Confirmations made in this session stay too — an older
      // backend does not send `confirmado` yet.
      setConfirmedProducts((prev) => {
        const next = new Set(prev);
        productos.forEach((p) => {
          if (p.confirmado) next.add(p.codigoProducto);
        });
        return next;
      });
      setPickedQtys((prev) => {
        const next = { ...prev };
        productos.forEach((p) => {
          if (p.confirmado && p.cantidadPreparada != null) {
            next[p.codigoProducto] = p.cantidadPreparada;
          } else if (!(p.codigoProducto in next)) {
            next[p.codigoProducto] = 0;
          }
        });
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

  // Reload on every visit: picking may have advanced (or the route been closed) elsewhere.
  useFocusEffect(
    useCallback(() => {
      loadConsolidado();
    }, [loadConsolidado])
  );

  // Back from confirmar-producto after a 409 PREPARACION_CERRADA: show the list read-only.
  useEffect(() => {
    if (preparacionCerrada) {
      setCerradaPorServidor(true);
      setSuccess(t("preparacion.alreadyPrepared"));
    }
  }, [preparacionCerrada, t]);

  const abierta = !cerradaPorServidor && preparacionAbierta(data?.status);

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
      if (!abierta || confirmedProducts.has(producto.codigoProducto)) return;

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
    [abierta, confirmedProducts, rutaId, router]
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
        onProductPress={abierta ? handleProductPress : undefined}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={
          <>
            {!abierta && <PreparacionCerradaBanner status={data?.status} />}
            <ProgressHeader
              totalProductos={totalProductos}
              productosPreparados={productosPreparados}
              noRuta={data?.noRuta ?? `Ruta ${rutaId}`}
              live={abierta}
            />
          </>
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
