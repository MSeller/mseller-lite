import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon, Snackbar, Text, useTheme } from "react-native-paper";
import PrepFooter from "../../../components/preparacion/PrepFooter";
import QuantityStepper from "../../../components/preparacion/QuantityStepper";
import BrandGradient from "../../../components/ui/BrandGradient";
import SectionAccessGate from "../../../components/navigation/SectionAccessGate";
import { gutterFor, type CustomTheme } from "../../../constants/Theme";
import { useTranslation } from "../../../hooks/useTranslation";
import { preparacionService } from "../../../services/preparacionService";

function ConfirmarProductoScreen() {
  const theme = useTheme() as CustomTheme;
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme, gutterFor(width)), [theme, width]);
  const { status } = theme.custom;
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    rutaId: string;
    codigoProducto: string;
    descripcion: string;
    cantidadTotal: string;
    unidad: string;
  }>();

  // Products without a description on the backend arrive with an empty name; show the code.
  const nombre = params.descripcion?.trim();
  const unidad = params.unidad?.trim() ?? "";
  const rutaId = parseInt(params.rutaId ?? "0", 10);
  const cantidadTotal = parseFloat(params.cantidadTotal ?? "0");

  const [cantidadPreparada, setCantidadPreparada] = useState(cantidadTotal.toString());
  const [observacion, setObservacion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const parsedCantidad = parseFloat(cantidadPreparada) || 0;
  const diferencia = parsedCantidad - cantidadTotal;
  const hayDiferencia = Math.abs(diferencia) > 0.001;
  const excedido = parsedCantidad > cantidadTotal;
  const observacionRequerida = hayDiferencia && !observacion.trim();
  const canConfirm = parsedCantidad >= 0 && !excedido && !observacionRequerida && !loading;

  const adjustTotal = (delta: number) => {
    const newVal = Math.max(0, Math.min(cantidadTotal, parsedCantidad + delta));
    setCantidadPreparada(newVal.toString());
  };

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError("");
      // Backend auto-distributes across clients proportionally
      await preparacionService.confirmarProducto({
        rutaId,
        codigoProducto: params.codigoProducto ?? "",
        cantidadTotal: parsedCantidad,
        observacion: hayDiferencia ? observacion : undefined,
      });
      // Navigate back with confirmed product info so picking screen updates
      router.navigate({
        pathname: "/preparacion/[rutaId]/picking" as any,
        params: {
          rutaId: params.rutaId ?? "0",
          confirmedProduct: params.codigoProducto,
          confirmedQty: parsedCantidad.toString(),
        },
      });
    } catch (err: any) {
      console.error("Error confirming product:", err);
      setError(err.response?.data?.message || t("preparacion.errorConfirmingProduct"));
    } finally {
      setLoading(false);
    }
  };

  const formatQty = (qty: number) => `${qty}${unidad ? ` ${unidad}` : ""}`;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Product */}
          <View style={styles.hero}>
            <Text style={styles.overline}>{t("preparacion.ui.confirmProductTitle")}</Text>
            <Text style={styles.title} accessibilityRole="header">
              {nombre || params.codigoProducto || ""}
            </Text>
            {(!!nombre || !!unidad) && (
              <Text style={styles.meta}>
                {[nombre ? params.codigoProducto : null, unidad].filter(Boolean).join(" · ")}
              </Text>
            )}
          </View>

          {/* Requested vs prepared */}
          <BrandGradient raised style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCell}>
                <Text style={styles.summaryOverline}>{t("preparacion.ui.requestedQty")}</Text>
                <Text style={styles.summaryFigure} numberOfLines={1} adjustsFontSizeToFit>
                  {formatQty(cantidadTotal)}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryCell}>
                <Text style={styles.summaryOverline}>{t("preparacion.ui.preparedQty")}</Text>
                <Text
                  style={[styles.summaryFigure, hayDiferencia && styles.summaryFigureAlert]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {formatQty(parsedCantidad)}
                </Text>
              </View>
            </View>
          </BrandGradient>

          {/* Quantity */}
          <View style={styles.section}>
            <Text style={styles.overline}>{t("preparacion.ui.preparedQty")}</Text>
            <QuantityStepper
              value={cantidadPreparada}
              onChangeText={setCantidadPreparada}
              onDecrement={() => adjustTotal(-1)}
              onIncrement={() => adjustTotal(1)}
              decrementDisabled={parsedCantidad <= 0}
              incrementDisabled={parsedCantidad >= cantidadTotal}
              accessibilityLabel={t("preparacion.ui.preparedQty")}
              decrementLabel={t("preparacion.ui.decrease")}
              incrementLabel={t("preparacion.ui.increase")}
            />
            <Text style={styles.hint}>{t("preparacion.ui.autoDistributionHint")}</Text>

            {hayDiferencia && !excedido && (
              <View style={styles.statusRow} accessibilityRole="alert">
                <Icon source="alert" size={18} color={status.warning.base} />
                <Text style={[styles.statusText, { color: status.warning.base }]}>
                  {t("preparacion.ui.difference", { count: diferencia })}
                </Text>
              </View>
            )}
            {excedido && (
              <View style={styles.statusRow} accessibilityRole="alert">
                <Icon source="alert-circle" size={18} color={status.negative.base} />
                <Text style={[styles.statusText, { color: status.negative.base }]}>
                  {t("preparacion.ui.cannotExceed")}
                </Text>
              </View>
            )}
          </View>

          {/* Observation (required on difference) */}
          {hayDiferencia && !excedido && (
            <View style={styles.section}>
              <Text style={styles.overline}>{t("preparacion.ui.observationRequired")}</Text>
              <TextInput
                value={observacion}
                onChangeText={setObservacion}
                multiline
                numberOfLines={3}
                placeholder={t("preparacion.ui.observationPlaceholder")}
                placeholderTextColor={theme.custom.colors.inkTertiary}
                accessibilityLabel={t("preparacion.ui.observationRequired")}
                style={styles.observation}
                selectionColor={theme.custom.colors.tint}
              />
            </View>
          )}
        </ScrollView>

        <PrepFooter
          label={t("preparacion.confirmProduct")}
          icon="check"
          onPress={handleConfirm}
          disabled={!canConfirm && !loading}
          loading={loading}
          secondary={{ label: t("common.cancel"), onPress: () => router.back(), disabled: loading }}
        />
      </KeyboardAvoidingView>

      <Snackbar visible={!!error} onDismiss={() => setError("")} duration={4000}>
        {error}
      </Snackbar>
    </SafeAreaView>
  );
}

const createStyles = (theme: CustomTheme, gutter: number) => {
  const { colors, spacing, type, radius, hairline } = theme.custom;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { paddingBottom: spacing.xxl },
    hero: { paddingHorizontal: gutter, paddingTop: spacing.lg, gap: spacing.xs },
    overline: { ...type.overline },
    title: { ...type.largeTitle },
    meta: { ...type.bodySmall },
    summaryCard: { marginHorizontal: gutter, marginTop: spacing.lg },
    summaryRow: { flexDirection: "row", alignItems: "stretch" },
    summaryCell: { flex: 1, padding: spacing.xl, gap: spacing.xs },
    summaryDivider: { width: hairline, backgroundColor: colors.onGradientDivider },
    summaryOverline: { ...type.overline, color: colors.onGradientSecondary },
    summaryFigure: { ...type.figure(28), color: colors.onGradient },
    summaryFigureAlert: { color: colors.onGradientAlert },
    section: { paddingHorizontal: gutter, paddingTop: spacing.xl, gap: spacing.md },
    hint: { ...type.caption, textAlign: "center" },
    statusRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    statusText: { ...type.bodySmall, fontWeight: "600", flexShrink: 1 },
    observation: {
      ...type.body,
      minHeight: 96,
      padding: spacing.md,
      paddingTop: spacing.md,
      textAlignVertical: "top",
      borderRadius: radius.control,
      backgroundColor: colors.fill,
    },
  });
};

export default function ConfirmarProductoRoute() {
  const { t } = useTranslation();
  return (
    <SectionAccessGate section="picking" message={t("preparacion.pickingNotAllowed")}>
      <ConfirmarProductoScreen />
    </SectionAccessGate>
  );
}
