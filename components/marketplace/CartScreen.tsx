import { useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import {
  Appbar,
  Button,
  Divider,
  Icon,
  IconButton,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import type { CustomTheme } from "../../constants/Theme";
import { useMarketplaceCart } from "../../contexts/MarketplaceCartContext";
import { useTranslation } from "../../hooks/useTranslation";
import { createPurchaseRequest } from "../../services/b2bService";
import { describeB2BError, newIdempotencyKey } from "../../utils/b2b";
import { formatMoney, formatQuantity } from "../../utils/documentFormat";
import AppCard from "../ui/AppCard";
import EmptyState from "../ui/EmptyState";
import QuantityStepper from "./QuantityStepper";

interface Props {
  tiendaId: string;
  tiendaNombre: string;
}

/**
 * The cart and the send that turns it into a purchase request.
 *
 * The request carries an `idempotencyKey` generated once per checkout attempt and kept
 * across retries: the phone is on a colmado's connection, so "it timed out, press it
 * again" is the normal way this fails, and without the key that second press is a second
 * order for the supplier to untangle. A new key is minted only after a request actually
 * lands, so the next cart is a genuinely new request.
 *
 * Prices here are the catalogue's. The supplier confirms quantities and the server
 * prices the request — the total on this screen is what the buyer is asking for, not a
 * promise.
 */
const CartScreen: React.FC<Props> = ({ tiendaId, tiendaNombre }) => {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cart = useMarketplaceCart();

  const [comentario, setComentario] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  // La clave de idempotencia va atada al CONTENIDO que se envía, no al montaje de la
  // pantalla.
  //
  // Antes se generaba una vez y solo rotaba al acertar, así que tras un fallo el comprador
  // podía cambiar cantidades, quitar líneas o editar el comentario y reintentar con la clave
  // vieja: el servidor deduplica por clave y devolvía la solicitud ANTERIOR, descartando en
  // silencio lo que acababa de editar. Reintentar lo mismo sigue siendo idempotente —misma
  // huella, misma clave—; reintentar algo distinto es una solicitud distinta.
  const idempotency = useRef<{ key: string; fingerprint: string }>({
    key: newIdempotencyKey(),
    fingerprint: "",
  });

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else
      router.replace({
        pathname: "/marketplace/[tiendaId]/catalogo",
        params: { tiendaId, nombre: tiendaNombre },
      });
  };

  const submit = async () => {
    if (submitting || cart.isEmpty) return;
    setSubmitting(true);
    setError("");

    const lineas = cart.lines.map((line) => ({
      codigoProducto: line.codigoProducto,
      cantidad: line.cantidad,
    }));
    const comentarioFinal = comentario.trim() || undefined;

    // Huella estable del envío: se ordena por código para que reordenar el carrito sin
    // cambiar nada no cuente como contenido distinto.
    const fingerprint = JSON.stringify({
      tiendaId,
      comentario: comentarioFinal ?? "",
      lineas: [...lineas].sort((a, b) => a.codigoProducto.localeCompare(b.codigoProducto)),
    });

    if (idempotency.current.fingerprint !== fingerprint) {
      idempotency.current = { key: newIdempotencyKey(), fingerprint };
    }

    try {
      const solicitud = await createPurchaseRequest({
        tiendaId,
        lineas,
        comentario: comentarioFinal,
        idempotencyKey: idempotency.current.key,
      });

      cart.clear();
      idempotency.current = { key: newIdempotencyKey(), fingerprint: "" };
      router.replace({
        pathname: "/marketplace/solicitudes/[noSolicitud]",
        params: { noSolicitud: solicitud.noSolicitud, creada: "1" },
      });
    } catch (e) {
      const failure = describeB2BError(e);
      setError(
        failure.message ||
          (failure.kind === "rateLimited"
            ? t("marketplace.errors.tooManyAttempts")
            : t("marketplace.errors.submitFailed"))
      );
    } finally {
      setSubmitting(false);
    }
  };

  const header = (
    <Appbar.Header mode="small" style={styles.appbar}>
      <Appbar.BackAction onPress={goBack} />
      {/* MD3 Appbar.Content ignores `subtitle`; the store is named on the empty state
          and on the request once it is sent. */}
      <Appbar.Content title={t("marketplace.cartTitle")} />
    </Appbar.Header>
  );

  if (cart.isEmpty || cart.tiendaId !== tiendaId) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        {header}
        <View style={styles.center}>
          <EmptyState
            icon="cart-outline"
            title={t("marketplace.emptyCartTitle")}
            message={t("marketplace.emptyCartBody")}
          />
          <Button mode="contained" onPress={goBack}>
            {t("marketplace.backToCatalog")}
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {header}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: 130 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
        >
          {cart.lines.map((line) => (
            <AppCard key={line.codigoProducto}>
              <View style={styles.lineContent}>
                <View style={styles.lineHeader}>
                  <View style={styles.lineTitle}>
                    <Text variant="titleSmall" style={styles.lineName} numberOfLines={2}>
                      {line.descripcion}
                    </Text>
                    <Text variant="bodySmall" style={styles.meta} numberOfLines={1}>
                      {line.codigoProducto}
                      {line.unidad ? ` · ${line.unidad}` : ""} · {formatMoney(line.precio)}
                    </Text>
                  </View>
                  <Text variant="titleMedium" style={styles.lineTotal}>
                    {formatMoney(line.cantidad * line.precio)}
                  </Text>
                </View>

                {!line.disponible && (
                  <View style={styles.warningRow}>
                    <Icon
                      source="alert-circle-outline"
                      size={16}
                      color={theme.custom.status.negative.base}
                    />
                    <Text variant="bodySmall" style={styles.warningText}>
                      {t("marketplace.outOfStockLine")}
                    </Text>
                  </View>
                )}

                {/*
                  Cantidad y eliminar son acciones DISTINTAS y ambas visibles. Antes el
                  menos se convertía en papelera al llegar a 1, así que quitar una línea con
                  cantidad 12 exigía doce toques y adivinar que el botón terminaría
                  cambiando de significado. Con la papelera siempre a la vista, quitar es
                  un solo toque desde cualquier cantidad.
                */}
                <View style={styles.actionsRow}>
                  <QuantityStepper
                    value={line.cantidad}
                    onChange={(cantidad) => cart.setQuantity(line.codigoProducto, cantidad)}
                    compact
                  />
                  <IconButton
                    icon="trash-can-outline"
                    mode="contained-tonal"
                    size={18}
                    containerColor={theme.custom.status.negative.container}
                    iconColor={theme.custom.status.negative.onContainer}
                    style={styles.removeButton}
                    onPress={() => cart.remove(line.codigoProducto)}
                    accessibilityLabel={t("marketplace.removeLine")}
                  />
                </View>
              </View>
            </AppCard>
          ))}

          <TextInput
            mode="outlined"
            label={t("marketplace.comment")}
            value={comentario}
            onChangeText={setComentario}
            multiline
            numberOfLines={3}
            style={styles.comment}
          />

          {!!error && (
            <Text variant="bodyMedium" style={styles.error}>
              {error}
            </Text>
          )}
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: 12 + insets.bottom }]}>
          <View style={styles.totalsRow}>
            <Text variant="bodyMedium" style={styles.meta}>
              {t("marketplace.itemsCount", { value: formatQuantity(cart.itemCount) })}
            </Text>
            <Text variant="titleLarge" style={styles.total}>
              {formatMoney(cart.total)}
            </Text>
          </View>
          <Divider style={styles.divider} />
          <Text variant="bodySmall" style={styles.disclaimer}>
            {t("marketplace.totalsDisclaimer")}
          </Text>
          <Button
            mode="contained"
            onPress={submit}
            loading={submitting}
            disabled={submitting}
            style={styles.submit}
            contentStyle={styles.submitContent}
          >
            {t("marketplace.sendRequest")}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (theme: CustomTheme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    flex: {
      flex: 1,
    },
    appbar: {
      backgroundColor: theme.colors.background,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
      paddingHorizontal: 32,
    },
    content: {
      padding: 16,
      gap: 12,
    },
    lineContent: {
      paddingVertical: 12,
      paddingHorizontal: 14,
      gap: 10,
    },
    lineHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },
    lineTitle: {
      flex: 1,
      gap: 2,
    },
    lineName: {
      color: theme.colors.onSurface,
      fontWeight: "600",
    },
    meta: {
      color: theme.colors.onSurfaceVariant,
    },
    lineTotal: {
      color: theme.colors.onSurface,
      fontWeight: "700",
    },
    actionsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    removeButton: {
      margin: 0,
      width: 44,
      height: 44,
      borderRadius: 12,
    },
    warningRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    warningText: {
      color: theme.custom.status.negative.base,
      flex: 1,
    },
    comment: {
      backgroundColor: theme.colors.surface,
      marginTop: 4,
    },
    error: {
      color: theme.colors.error,
    },
    bottomBar: {
      paddingHorizontal: 16,
      paddingTop: 12,
      backgroundColor: theme.colors.surface,
      borderTopWidth: theme.custom.hairline,
      borderTopColor: theme.colors.outlineVariant,
    },
    totalsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    total: {
      color: theme.colors.onSurface,
      fontWeight: "700",
    },
    divider: {
      marginVertical: 8,
    },
    disclaimer: {
      color: theme.colors.onSurfaceVariant,
    },
    submit: {
      marginTop: 10,
    },
    submitContent: {
      height: 52,
    },
  });

export default CartScreen;
