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
import { Icon, Text, useTheme } from "react-native-paper";
import { gutterFor, type CustomTheme } from "../../constants/Theme";
import { useTranslation } from "../../hooks/useTranslation";
import { ConsolidadoDistribucion, DistribucionCliente } from "../../types/preparacion";
import PrepFooter from "./PrepFooter";
import QuantityStepper, { QuantityField } from "./QuantityStepper";

interface ClienteDistribucion {
  codigoCliente: string;
  cantidadSolicitada: number;
  cantidadAsignada: number;
}

interface DistributionFormProps {
  codigoProducto: string;
  descripcion: string;
  cantidadTotal: number;
  distribucionClientes: ConsolidadoDistribucion[];
  onConfirm: (
    cantidadPreparada: number,
    distribucion: DistribucionCliente[],
    observacion?: string
  ) => void;
  onCancel: () => void;
  loading?: boolean;
}

const DistributionForm: React.FC<DistributionFormProps> = ({
  codigoProducto,
  descripcion,
  cantidadTotal,
  distribucionClientes,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const theme = useTheme() as CustomTheme;
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme, gutterFor(width)), [theme, width]);
  const { status } = theme.custom;
  const { t } = useTranslation();

  const [cantidadPreparada, setCantidadPreparada] = useState(
    cantidadTotal.toString()
  );
  const [observacion, setObservacion] = useState("");

  // Build client distribution from backend distribucion data
  const initialDistribution: ClienteDistribucion[] = useMemo(() => {
    if (distribucionClientes.length === 0) return [];
    return distribucionClientes.map((d) => ({
      codigoCliente: d.codigoCliente,
      cantidadSolicitada: d.cantidad,
      cantidadAsignada: d.cantidad,
    }));
  }, [distribucionClientes]);

  const [distribucion, setDistribucion] =
    useState<ClienteDistribucion[]>(initialDistribution);

  const parsedCantidad = parseInt(cantidadPreparada, 10) || 0;
  const totalDistribuido = distribucion.reduce(
    (sum, d) => sum + d.cantidadAsignada,
    0
  );
  const diferencia = parsedCantidad - cantidadTotal;
  const distribucionValida = totalDistribuido === parsedCantidad;
  const hayDiferencia = diferencia !== 0;
  const excedido = parsedCantidad > cantidadTotal;
  const observacionRequerida = hayDiferencia && !observacion.trim();

  const canConfirm =
    parsedCantidad > 0 &&
    distribucionValida &&
    !excedido &&
    !observacionRequerida &&
    !loading;

  const updateClienteAmount = (index: number, value: string) => {
    const parsed = parseInt(value, 10) || 0;
    setDistribucion((prev) =>
      prev.map((d, i) => (i === index ? { ...d, cantidadAsignada: parsed } : d))
    );
  };

  const adjustTotal = (delta: number) => {
    const newVal = Math.max(0, Math.min(cantidadTotal, parsedCantidad + delta));
    setCantidadPreparada(newVal.toString());
    // Auto-redistribute proportionally when quantity changes
    autoDistribute(newVal);
  };

  const autoDistribute = (total: number) => {
    if (distribucionClientes.length === 0) return;
    const newDist = distribucion.map((d) => {
      const ratio =
        cantidadTotal > 0 ? d.cantidadSolicitada / cantidadTotal : 0;
      return { ...d, cantidadAsignada: Math.floor(ratio * total) };
    });
    // Assign remainder to first client
    const distributed = newDist.reduce((s, d) => s + d.cantidadAsignada, 0);
    if (newDist.length > 0) {
      newDist[0].cantidadAsignada += total - distributed;
    }
    setDistribucion(newDist);
  };

  const handleConfirm = () => {
    onConfirm(
      parsedCantidad,
      distribucion.map((d) => ({
        codigoCliente: d.codigoCliente,
        cantidad: d.cantidadAsignada,
      })),
      hayDiferencia ? observacion : undefined
    );
  };

  const distributionTone = distribucionValida ? status.positive : status.negative;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Product */}
        <View style={styles.hero}>
          <Text style={styles.overline}>{t("preparacion.ui.confirmProductTitle")}</Text>
          <Text style={styles.title} accessibilityRole="header">
            {descripcion}
          </Text>
          <Text style={styles.meta}>{codigoProducto}</Text>
        </View>

        {/* Quantity */}
        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={styles.overline}>{t("preparacion.ui.requestedQty")}</Text>
            <Text style={styles.labelFigure}>{cantidadTotal}</Text>
          </View>
          <Text style={styles.overline}>{t("preparacion.ui.preparedQty")}</Text>
          <QuantityStepper
            value={cantidadPreparada}
            onChangeText={(val) => {
              setCantidadPreparada(val);
              const parsed = parseInt(val, 10) || 0;
              autoDistribute(parsed);
            }}
            onDecrement={() => adjustTotal(-1)}
            onIncrement={() => adjustTotal(1)}
            decrementDisabled={parsedCantidad <= 0}
            incrementDisabled={parsedCantidad >= cantidadTotal}
            accessibilityLabel={t("preparacion.ui.preparedQty")}
            decrementLabel={t("preparacion.ui.decrease")}
            incrementLabel={t("preparacion.ui.increase")}
          />

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

        {/* Client distribution */}
        <View style={styles.listHeader}>
          <Text style={styles.overline}>{t("preparacion.ui.distributionByCustomer")}</Text>
          <Text style={styles.caption}>
            {hayDiferencia
              ? t("preparacion.ui.distributionManual")
              : t("preparacion.ui.distributionAuto")}
          </Text>
        </View>
        <View style={styles.rowsTop} />

        {distribucion.map((d, index) => (
          <View key={d.codigoCliente} style={styles.clientRow}>
            <View style={styles.clientInfo}>
              <Text style={styles.clientName} numberOfLines={1}>
                {`${index + 1}. ${d.codigoCliente}`}
              </Text>
              <Text style={styles.caption}>
                {t("preparacion.ui.requestedAmount", { qty: d.cantidadSolicitada })}
              </Text>
            </View>
            <QuantityField
              value={d.cantidadAsignada.toString()}
              onChangeText={(val) => updateClienteAmount(index, val)}
              accessibilityLabel={`${d.codigoCliente}, ${t("preparacion.ui.requestedAmount", {
                qty: d.cantidadSolicitada,
              })}`}
            />
          </View>
        ))}

        {/* Meaning from the icon as well as the colour. */}
        <View style={styles.totalRow} accessibilityRole="summary">
          <Icon
            source={distribucionValida ? "check-circle" : "alert-circle"}
            size={20}
            color={distributionTone.base}
          />
          <Text style={[styles.totalText, { color: distributionTone.base }]}>
            {t("preparacion.ui.totalDistributed", {
              distributed: totalDistribuido,
              total: parsedCantidad,
            })}
          </Text>
        </View>

        {/* Observation (required when there's a difference) */}
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
        label={t("common.confirm")}
        icon="check"
        onPress={handleConfirm}
        disabled={!canConfirm && !loading}
        loading={loading}
        secondary={{ label: t("common.cancel"), onPress: onCancel, disabled: loading }}
      />
    </KeyboardAvoidingView>
  );
};

const createStyles = (theme: CustomTheme, gutter: number) => {
  const { colors, spacing, type, radius, hairline, touchTarget } = theme.custom;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingBottom: spacing.xxl,
    },
    hero: {
      paddingHorizontal: gutter,
      paddingTop: spacing.lg,
      gap: spacing.xs,
    },
    overline: {
      ...type.overline,
    },
    title: {
      ...type.largeTitle,
    },
    meta: {
      ...type.bodySmall,
    },
    caption: {
      ...type.caption,
    },
    section: {
      paddingHorizontal: gutter,
      paddingTop: spacing.xl,
      gap: spacing.md,
    },
    labelRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    labelFigure: {
      ...type.figure(17),
    },
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    statusText: {
      ...type.bodySmall,
      fontWeight: "600",
      flexShrink: 1,
    },
    listHeader: {
      paddingHorizontal: gutter,
      paddingTop: spacing.xxl,
      paddingBottom: spacing.md,
      gap: spacing.xs,
    },
    rowsTop: {
      height: hairline,
      backgroundColor: colors.hairline,
    },
    clientRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: gutter,
      paddingVertical: spacing.sm,
      minHeight: touchTarget + spacing.lg,
      borderBottomWidth: hairline,
      borderBottomColor: colors.hairline,
    },
    clientInfo: {
      flex: 1,
      minWidth: 0,
    },
    clientName: {
      ...type.rowTitle,
    },
    totalRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: spacing.sm,
      paddingHorizontal: gutter,
      paddingTop: spacing.md,
    },
    totalText: {
      ...type.figure(15),
    },
    observation: {
      ...type.body,
      minHeight: 96,
      padding: spacing.md,
      textAlignVertical: "top",
      borderRadius: radius.control,
      backgroundColor: colors.fill,
    },
  });
};

export default DistributionForm;
