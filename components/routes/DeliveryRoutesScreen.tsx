import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "react-native-paper";
import type { CustomTheme } from "@/constants/Theme";
import { useTranslation } from "@/hooks/useTranslation";
import { entregaService } from "../../services/entregaService";
import { EntregaRuta } from "../../types/entrega";
import { vehiculoLabel } from "../../utils/mapLinks";
import { routeStatusLabelKey, describeRouteListError, type RouteListFailure } from "../../utils/routeStatus";
import StatusChip from "../ui/StatusChip";
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

interface DeliveryRoutesScreenProps {
  /** Rendered above the title, under the status bar — the Rutas section switcher. */
  headerAccessory?: React.ReactNode;
}

export default function DeliveryRoutesScreen({ headerAccessory }: DeliveryRoutesScreenProps) {
  const theme = useTheme() as CustomTheme;
  // iOS draws the tab bar over the list; this is how much of the bottom it covers.
  const tabOverflow = useBottomTabOverflow();
  const styles = useMemo(() => createStyles(theme, tabOverflow), [theme, tabOverflow]);
  const router = useRouter();
  const { t } = useTranslation();

  const [rutas, setRutas] = useState<EntregaRuta[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failure, setFailure] = useState<RouteListFailure | null>(null);

  const loadRutas = useCallback(async () => {
    try {
      const data = await entregaService.getRutas();
      // Active route first, then most recent.
      const items = [...data.items].sort(
        (a, b) => Number(b.esActiva) - Number(a.esActiva)
      );
      setRutas(items);
      // Cleared only once a load answers, so retrying a failed list never flashes "no routes".
      setFailure(null);
    } catch (err: any) {
      setFailure(describeRouteListError(err, t("entrega.errorLoading"), { unassignedOn400: true }));
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

  const renderRuta = (ruta: EntregaRuta, index: number) => {
    const progress =
      ruta.totalFacturas > 0 ? ruta.facturasEntregadas / ruta.totalFacturas : 0;
    const veh = [vehiculoLabel(ruta.vehiculoTipo), ruta.vehiculoPlaca]
      .filter(Boolean)
      .join(" · ");
    const status = t(routeStatusLabelKey(ruta.status));
    const accessibilityLabel = [
      t("entrega.list.a11yRoute", { ruta: ruta.noRuta }),
      ruta.esActiva ? t("entrega.active") : "",
      status,
      veh,
      t("entrega.list.a11yProgress", {
        delivered: ruta.facturasEntregadas,
        total: ruta.totalFacturas,
        pending: ruta.facturasPendientes,
      }),
    ]
      .filter(Boolean)
      .join(", ");

    return (
      <React.Fragment key={ruta.rutaId}>
        {index > 0 && <RouteRowSeparator />}
        <RouteRow
          title={ruta.noRuta}
          // The driver's route for today: a status-toned chip by the number, the same
          // language as the status chip beside it, rather than a coloured edge.
          titleAccessory={
            ruta.esActiva ? <StatusChip label={t("entrega.active")} tone="positive" /> : undefined
          }
          status={ruta.status}
          lines={[veh, t("entrega.list.invoiceCount", { count: ruta.totalFacturas })].filter(Boolean)}
          progress={progress}
          progressFigure={`${ruta.facturasEntregadas}/${ruta.totalFacturas}`}
          progressLabel={`${t("entrega.delivered")} · ${ruta.facturasPendientes} ${t("entrega.pending")}`}
          accessibilityLabel={accessibilityLabel}
          onPress={() => router.push(`/entrega/${ruta.rutaId}` as any)}
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
            disabledTitle={t("entrega.list.disabledTitle")}
            disabledBody={t("entrega.list.disabledBody")}
            failedTitle={t("entrega.list.failedTitle")}
            onRetry={loadRutas}
          />
        );
      }
      return (
        <RouteListEmpty
          icon="truck-check-outline"
          title={t("entrega.noRoutes")}
          message={t("entrega.list.emptyBody")}
        />
      );
    }
    return (
      <>
        <RouteListOverline label={t("entrega.list.count", { count: rutas.length })} />
        {rutas.map(renderRuta)}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {headerAccessory}
      <RouteListHeader title={t("entrega.title")} subtitle={t("entrega.subtitle")} />

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
