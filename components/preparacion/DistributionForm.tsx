import React, { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Divider,
  Icon,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import type { CustomTheme } from "../../constants/Theme";
import { ConsolidadoDistribucion, DistribucionCliente } from "../../types/preparacion";

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
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { status } = theme.custom;

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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Product info header */}
        <View
          style={[
            styles.productHeader,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
        >
          <Text variant="titleLarge" style={{ fontWeight: "bold" }}>
            {descripcion}
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
          >
            {codigoProducto}
          </Text>
        </View>

        {/* Quantity input */}
        <View style={styles.section}>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
            Cantidad total solicitada:{" "}
            <Text style={{ fontWeight: "bold" }}>{cantidadTotal}</Text>
          </Text>

          <Text
            variant="bodyLarge"
            style={{ color: theme.colors.onSurface, marginTop: 16 }}
          >
            Cantidad total preparada:
          </Text>
          <View style={styles.stepperRow}>
            <Button
              mode="outlined"
              onPress={() => adjustTotal(-1)}
              style={styles.stepperButton}
              contentStyle={styles.stepperButtonContent}
              disabled={parsedCantidad <= 0}
            >
              −
            </Button>
            <TextInput
              value={cantidadPreparada}
              onChangeText={(val) => {
                setCantidadPreparada(val);
                const parsed = parseInt(val, 10) || 0;
                autoDistribute(parsed);
              }}
              keyboardType="number-pad"
              style={[
                styles.quantityInput,
                { backgroundColor: theme.colors.surface },
              ]}
              contentStyle={styles.quantityInputContent}
              mode="outlined"
            />
            <Button
              mode="outlined"
              onPress={() => adjustTotal(1)}
              style={styles.stepperButton}
              contentStyle={styles.stepperButtonContent}
              disabled={parsedCantidad >= cantidadTotal}
            >
              +
            </Button>
          </View>

          {hayDiferencia && !excedido && (
            <View style={styles.warningRow}>
              <Icon source="alert" size={18} color={status.warning.base} />
              <Text style={styles.warningText}>
                Diferencia: {diferencia} unidades
              </Text>
            </View>
          )}
          {excedido && (
            <View style={styles.warningRow}>
              <Icon source="alert-circle" size={18} color={status.negative.base} />
              <Text style={[styles.warningText, { color: status.negative.base }]}>
                No puede exceder la cantidad solicitada
              </Text>
            </View>
          )}
        </View>

        <Divider />

        {/* Client distribution */}
        <View style={styles.section}>
          <Text
            variant="titleMedium"
            style={{ fontWeight: "bold", marginBottom: 4 }}
          >
            Distribución por cliente
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}
          >
            {hayDiferencia
              ? "Ajuste manual — verifique asignación"
              : "Auto-calculada, editable"}
          </Text>

          {distribucion.map((d, index) => (
            <View key={d.codigoCliente} style={styles.clientRow}>
              <View style={styles.clientInfo}>
                <Text variant="bodyLarge" style={{ fontWeight: "600" }}>
                  {index + 1}. {d.codigoCliente}
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  Solicitado: {d.cantidadSolicitada}
                </Text>
              </View>
              <TextInput
                value={d.cantidadAsignada.toString()}
                onChangeText={(val) => updateClienteAmount(index, val)}
                keyboardType="number-pad"
                style={[
                  styles.clientInput,
                  { backgroundColor: theme.colors.surface },
                ]}
                contentStyle={styles.clientInputContent}
                mode="outlined"
              />
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text
              variant="bodyLarge"
              style={{
                fontWeight: "bold",
                color: distribucionValida ? status.positive.base : status.negative.base,
              }}
            >
              {distribucionValida ? "✓" : "⚠"} Total distribuido:{" "}
              {totalDistribuido} / {parsedCantidad}
            </Text>
          </View>
        </View>

        {/* Observation (required when there's a difference) */}
        {hayDiferencia && !excedido && (
          <View style={styles.section}>
            <Divider style={{ marginBottom: 16 }} />
            <TextInput
              label="Observación (requerida)"
              value={observacion}
              onChangeText={setObservacion}
              mode="outlined"
              multiline
              numberOfLines={3}
              placeholder="Razón de la diferencia..."
              style={{ backgroundColor: theme.colors.surface }}
            />
          </View>
        )}
      </ScrollView>

      {/* Fixed bottom action bar */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.custom.colors.hairline,
          },
        ]}
      >
        <Button
          mode="outlined"
          onPress={onCancel}
          style={styles.bottomButton}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          mode="contained"
          onPress={handleConfirm}
          style={styles.bottomButton}
          disabled={!canConfirm}
          loading={loading}
          icon="check"
        >
          Confirmar
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
};

const createStyles = (theme: CustomTheme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  productHeader: {
    padding: 16,
    borderBottomWidth: theme.custom.hairline,
    borderBottomColor: theme.custom.colors.hairline,
  },
  section: {
    padding: 16,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    gap: 12,
  },
  stepperButton: {
    minWidth: 48,
    minHeight: 48,
  },
  stepperButtonContent: {
    minHeight: 48,
  },
  quantityInput: {
    flex: 1,
    maxWidth: 140,
    textAlign: "center",
  },
  quantityInputContent: {
    ...theme.custom.type.figure(32),
    textAlign: "center",
  },
  warningRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 6,
  },
  warningText: {
    color: theme.custom.status.warning.base,
    fontWeight: "600",
  },
  clientRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    minHeight: 48,
  },
  clientInfo: {
    flex: 1,
    marginRight: 12,
  },
  clientInput: {
    width: 90,
    textAlign: "center",
  },
  clientInputContent: {
    ...theme.custom.type.figure(18),
    textAlign: "center",
  },
  totalRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: theme.custom.hairline,
    borderTopColor: theme.custom.colors.hairline,
  },
  bottomBar: {
    flexDirection: "row",
    padding: 16,
    paddingBottom: 32,
    gap: 12,
    borderTopWidth: theme.custom.hairline,
  },
  bottomButton: {
    flex: 1,
    minHeight: 48,
  },
});

export default DistributionForm;
