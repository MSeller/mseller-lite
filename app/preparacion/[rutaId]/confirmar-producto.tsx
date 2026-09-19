import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Icon, Snackbar, Text, TextInput, useTheme } from "react-native-paper";
import AppCard from "../../../components/ui/AppCard";
import type { CustomTheme } from "../../../constants/Theme";
import { preparacionService } from "../../../services/preparacionService";

export default function ConfirmarProductoScreen() {
  const theme = useTheme() as CustomTheme;
  const { status } = theme.custom;
  const router = useRouter();
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
      setError(err.response?.data?.message || "Error al confirmar producto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["top", "left", "right"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Product info */}
          <AppCard style={styles.productHeader} contentStyle={styles.productHeaderContent}>
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
              {nombre || params.codigoProducto || ""}
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              {[nombre ? params.codigoProducto : null, unidad].filter(Boolean).join("  ·  ")}
            </Text>
          </AppCard>

          {/* Quantity */}
          <View style={styles.section}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
              Cantidad solicitada:{" "}
              <Text style={{ fontWeight: "bold" }}>{cantidadTotal} {unidad}</Text>
            </Text>

            <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, marginTop: 16 }}>
              Cantidad preparada:
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
                onChangeText={setCantidadPreparada}
                keyboardType="number-pad"
                style={[styles.quantityInput, { backgroundColor: theme.colors.surface }]}
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

            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, textAlign: "center" }}>
              La distribución entre clientes se calcula automáticamente
            </Text>

            {hayDiferencia && !excedido && (
              <View style={styles.warningRow}>
                <Icon source="alert" size={18} color={status.warning.base} />
                <Text style={[styles.warningText, { color: status.warning.base }]}>
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

          {/* Observation (required on difference) */}
          {hayDiferencia && !excedido && (
            <View style={styles.section}>
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

        {/* Bottom action bar */}
        <View style={[styles.bottomBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outlineVariant }]}>
          <Button mode="outlined" onPress={() => router.back()} style={styles.bottomButton} disabled={loading}>
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

      <Snackbar visible={!!error} onDismiss={() => setError("")} duration={4000}>
        {error}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  productHeader: { marginHorizontal: 12, marginTop: 12 },
  productHeaderContent: { padding: 16 },
  section: { padding: 16 },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    gap: 12,
  },
  stepperButton: { minWidth: 48, minHeight: 48 },
  stepperButtonContent: { minHeight: 48 },
  quantityInput: { flex: 1, maxWidth: 140, textAlign: "center" },
  quantityInputContent: { fontSize: 32, fontWeight: "900", textAlign: "center" },
  warningRow: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 6 },
  warningText: { fontWeight: "600" },
  bottomBar: {
    flexDirection: "row",
    padding: 16,
    paddingBottom: 32,
    gap: 12,
    borderTopWidth: 1,
  },
  bottomButton: { flex: 1, minHeight: 48 },
});
