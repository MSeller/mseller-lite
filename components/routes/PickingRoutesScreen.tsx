import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "react-native-paper";
import type { CustomTheme } from "@/constants/Theme";
import { useNavigationAccess } from "@/hooks/useNavigationAccess";
import { useTranslation } from "@/hooks/useTranslation";
import { preparacionService } from "../../services/preparacionService";
import { RutaPreparacion } from "../../types/preparacion";
import { routeStatusLabelKey, describeRouteListError, type RouteListFailure } from "../../utils/routeStatus";
import { useBottomTabOverflow } from "../ui/TabBarBackground";
import {
  RouteListEmpty,
  RouteListError,
  RouteListFailureState,
  RouteListHeader,
  RouteListOverline,
  RouteListSkeleton,
  RouteRow,
  RouteRowSeparator,
} from "./RouteListParts";

interface PickingRoutesScreenProps {
  /** Rendered above the title, under the status bar — the Rutas section switcher. */
  headerAccessory?: React.ReactNode;
  /**
   * `picking` (default) lists every route being prepared. `loading` is the driver's
   * Carga tab: only routes ready for dispatch, each opening straight on the truck load.
   */
  mode?: "picking" | "loading";
}

export default function PickingRoutesScreen({ headerAccessory, mode = "picking" }: PickingRoutesScreenProps) {
  const theme = useTheme() as CustomTheme;
  // iOS draws the tab bar over the list; this is how much of the bottom it covers.
  const tabOverflow = useBottomTabOverflow();
  const styles = useMemo(() => createStyles(theme, tabOverflow), [theme, tabOverflow]);
  const router = useRouter();
  const { t } = useTranslation();
  const { can, loading: accessLoading } = useNavigationAccess();

  const [rutas, setRutas] = useState<RutaPreparacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failure, setFailure] = useState<RouteListFailure | null>(null);

  const loadRutas = useCallback(async () => {
    try {
      const data = await preparacionService.getRutasPreparacion();
      setRutas(mode === "loading" ? data.filter((ruta) => ruta.status === "lista_despacho") : data);
      // Cleared only once a load answers, so retrying a failed list never flashes "no routes".
      setFailure(null);
    } catch (err: any) {
      console.error("Error loading rutas:", err);
      setFailure(describeRouteListError(err, t("preparacion.errorLoading")));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t, mode]);

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
    if (mode === "loading" || (ruta.status === "lista_despacho" && can("truckLoading"))) {
      router.push(`/preparacion/${ruta.rutaId}/loading` as any);
    } else {
      router.push(`/preparacion/${ruta.rutaId}/picking` as any);
    }
  };

  const copy =
    mode === "loading"
      ? {
          title: t("preparacion.loadingListTitle"),
          subtitle: t("preparacion.loadingListSubtitle"),
          empty: t("preparacion.noRoutesToLoad"),
          emptyBody: t("preparacion.list.emptyLoadingBody"),
          emptyIcon: "truck-outline",
        }
      : {
          title: t("preparacion.title"),
          subtitle: t("preparacion.subtitle"),
          empty: t("preparacion.noRoutes"),
          emptyBody: t("preparacion.list.emptyBody"),
          emptyIcon: "package-variant-closed",
        };

  const getProgress = (ruta: RutaPreparacion) =>
    ruta.totalProductos > 0
      ? ruta.productosPreparados / ruta.totalProductos
      : 0;

  const renderRuta = (ruta: RutaPreparacion, index: number) => {
    const status = t(routeStatusLabelKey(ruta.status));
    const counts = [
      t("preparacion.list.orderCount", { count: ruta.totalPedidos }),
      t("preparacion.list.productCount", { count: ruta.totalProductos }),
    ].join(" · ");
    const accessibilityLabel = [
      t("preparacion.list.a11yRoute", { ruta: ruta.noRuta }),
      status,
      ruta.distribuidor,
      counts,
      t("preparacion.list.a11yProgress", {
        done: ruta.productosPreparados,
        total: ruta.totalProductos,
      }),
    ]
      .filter(Boolean)
      .join(", ");

    return (
      <React.Fragment key={ruta.rutaId}>
        {index > 0 && <RouteRowSeparator />}
        <RouteRow
          title={ruta.noRuta}
          status={ruta.status}
          lines={[ruta.distribuidor, counts].filter(Boolean)}
          progress={getProgress(ruta)}
          progressFigure={`${ruta.productosPreparados}/${ruta.totalProductos}`}
          progressLabel={t("preparacion.prepared")}
          accessibilityLabel={accessibilityLabel}
          onPress={() => handleRutaPress(ruta)}
        />
      </React.Fragment>
    );
  };

  const renderBody = () => {
    if (loading && rutas.length === 0) return <RouteListSkeleton />;
    // With no rows to fall back on, why the list could not load fills the screen.
    if (rutas.length === 0) {
      if (failure) {
        return (
          <RouteListFailureState
            failure={failure}
            disabledTitle={t("preparacion.list.disabledTitle")}
            disabledBody={t("preparacion.list.disabledBody")}
            failedTitle={t("preparacion.list.failedTitle")}
            onRetry={loadRutas}
          />
        );
      }
      return (
        <RouteListEmpty icon={copy.emptyIcon} title={copy.empty} message={copy.emptyBody} />
      );
    }
    return (
      <>
        <RouteListOverline label={t("preparacion.list.count", { count: rutas.length })} />
        {rutas.map(renderRuta)}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {headerAccessory}
      <RouteListHeader title={copy.title} subtitle={copy.subtitle} />

      {!!failure && rutas.length > 0 && <RouteListError message={failure.message} onRetry={loadRutas} />}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {renderBody()}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: CustomTheme, tabOverflow: number) => {
  const { colors, spacing } = theme.custom;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: spacing.xxl + tabOverflow,
    },
  });
};
