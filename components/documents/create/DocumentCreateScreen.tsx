import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Banner,
  Button,
  Chip,
  Divider,
  Icon,
  ProgressBar,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import type { CustomTheme } from "../../../constants/Theme";
import { useUser } from "../../../contexts/UserContext";
import { useDocumentCart } from "../../../hooks/useDocumentCart";
import { useTranslation } from "../../../hooks/useTranslation";
import { createDocument } from "../../../services/documentService";
import {
  listPaymentConditions,
  type PaymentCondition,
} from "../../../services/paymentConditionService";
import { DOCUMENT_TYPES, type CustomerSummary, type DocumentType } from "../../../types/documents";
import { formatMoney } from "../../../utils/documentFormat";
import AppCard from "../../ui/AppCard";
import SectionHeader from "../../ui/SectionHeader";
import { DOCUMENT_TYPE_META } from "../documentMeta";
import CartLineCard from "./CartLineCard";
import CustomerPickerModal from "./CustomerPickerModal";
import ProductPickerModal from "./ProductPickerModal";

type Step = 0 | 1 | 2;
const STEP_COUNT = 3;

/** Makes a retry safe if the network drops after the server already committed. */
const newIdempotencyKey = () =>
  `lite-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * Capture an invoice, order or quote in three steps: what kind and for whom,
 * what is on it, and confirm.
 *
 * Online only. There is no draft queue behind this screen, so a failed save
 * keeps the user on the form with everything still filled in rather than
 * claiming success and losing the work.
 */
const DocumentCreateScreen: React.FC = () => {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();
  const { userProfile } = useUser();

  const cart = useDocumentCart();

  const [step, setStep] = useState<Step>(0);
  const [tipoDocumento, setTipoDocumento] = useState<DocumentType>("invoice");
  const [customer, setCustomer] = useState<CustomerSummary | null>(null);
  const [condicionPago, setCondicionPago] = useState<string | null>(null);
  const [nota, setNota] = useState("");

  const [conditions, setConditions] = useState<PaymentCondition[]>([]);
  const [conditionsLoading, setConditionsLoading] = useState(true);

  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [productPickerOpen, setProductPickerOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  // Held for the whole screen: a retry after an ambiguous failure must reuse the
  // same key, or the retry is what creates the duplicate.
  const [idempotencyKey] = useState(newIdempotencyKey);

  const canEditPrice = userProfile?.editPrice ?? false;

  useEffect(() => {
    let active = true;
    listPaymentConditions()
      .then((result) => active && setConditions(result))
      .catch(() => active && setConditions([]))
      .finally(() => active && setConditionsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const handleSelectCustomer = useCallback((selected: CustomerSummary) => {
    setCustomer(selected);
    // The customer's own condition is the right default — it is what the portal
    // would use — but it stays overridable for a one-off cash sale.
    //
    // Cleared rather than carried over when the new customer has none: keeping the
    // previous customer's terms would quietly bill this one on someone else's
    // credit. Nothing selected disables "Next", which is the honest state.
    setCondicionPago(selected.condicionPago?.trim() || null);
  }, []);

  // A customer can carry a condition code the tenant has since removed. Left as is
  // it would select no chip while "Next" stayed enabled, and fail only at save with
  // a message about a code the user never chose — so reconcile against the
  // catalogue once it is known.
  useEffect(() => {
    if (conditionsLoading || !condicionPago) return;
    const existe = conditions.some((c) => c.condicionPago.trim() === condicionPago);
    if (!existe) setCondicionPago(null);
  }, [conditions, conditionsLoading, condicionPago]);

  const stepValid = useMemo(() => {
    switch (step) {
      case 0:
        return !!customer && !!condicionPago;
      case 1:
        return !cart.isEmpty;
      default:
        return !cart.isEmpty && !!customer && !!condicionPago;
    }
  }, [step, customer, condicionPago, cart.isEmpty]);

  const handleSubmit = useCallback(async () => {
    if (!customer || !condicionPago || cart.isEmpty) return;

    setSubmitting(true);
    setError("");
    try {
      const created = await createDocument({
        tipoDocumento,
        codigoCliente: customer.codigo,
        condicionPago,
        localidadId: customer.localidadId || undefined,
        nota: nota.trim() || undefined,
        idempotencyKey,
        items: cart.toRequestItems(),
      });

      cart.clear();
      // replace, not push: the created document is the destination, and backing
      // into a spent capture form would invite a duplicate.
      router.replace(`/documentos/${encodeURIComponent(created.noPedidoStr)}`);
    } catch (e: any) {
      const status = e?.response?.status;
      setError(
        status === 403
          ? t("documents.errors.forbidden")
          : e?.response?.data?.message || t("documents.errors.createFailed")
      );
      setSubmitting(false);
    }
  }, [customer, condicionPago, cart, tipoDocumento, nota, idempotencyKey, router, t]);

  const confirmDiscard = useCallback(() => {
    if (cart.isEmpty && !customer) {
      router.back();
      return;
    }
    Alert.alert(t("documents.discardTitle"), t("documents.discardBody"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("documents.discardConfirm"), style: "destructive", onPress: () => router.back() },
    ]);
  }, [cart.isEmpty, customer, router, t]);

  // ── Steps ────────────────────────────────────────────────────────────────

  const renderTypeAndCustomer = () => (
    <View style={styles.stepBody}>
      <SectionHeader title={t("documents.stepType")} />

      <View style={styles.typeRow}>
        {DOCUMENT_TYPES.map((type) => {
          const meta = DOCUMENT_TYPE_META[type];
          const active = tipoDocumento === type;
          const accent = theme.colors[meta.accent];
          return (
            <TouchableRipple
              key={type}
              onPress={() => setTipoDocumento(type)}
              style={[
                styles.typeCard,
                active && { borderColor: accent, backgroundColor: `${accent}14` },
              ]}
              borderless
            >
              <View style={styles.typeCardInner}>
                <Icon
                  source={meta.icon}
                  size={28}
                  color={active ? accent : theme.colors.onSurfaceVariant}
                />
                <Text
                  variant="labelLarge"
                  style={[styles.typeLabel, active && { color: accent, fontWeight: "700" }]}
                >
                  {t(meta.labelKey)}
                </Text>
              </View>
            </TouchableRipple>
          );
        })}
      </View>

      <SectionHeader title={t("documents.stepCustomer")} />

      <AppCard onPress={() => setCustomerPickerOpen(true)}>
        <View style={styles.selectorInner}>
            <View style={styles.selectorIcon}>
              <Icon
                source={customer ? "account-check" : "account-search"}
                size={24}
                color={theme.colors.primary}
              />
            </View>
            <View style={styles.selectorBody}>
              {customer ? (
                <>
                  <Text variant="titleSmall" style={styles.selectorTitle} numberOfLines={1}>
                    {customer.nombre}
                  </Text>
                  <Text variant="bodySmall" style={styles.selectorMeta} numberOfLines={1}>
                    {customer.codigo}
                    {customer.telefono ? ` · ${customer.telefono}` : ""}
                  </Text>
                </>
              ) : (
                <>
                  <Text variant="titleSmall" style={styles.selectorTitle}>
                    {t("documents.selectCustomer")}
                  </Text>
                  <Text variant="bodySmall" style={styles.selectorMeta}>
                    {t("documents.selectCustomerHint")}
                  </Text>
                </>
              )}
            </View>
          <Icon source="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
        </View>
      </AppCard>

      <SectionHeader title={t("documents.paymentCondition")} />

      {conditionsLoading ? (
        <ActivityIndicator style={styles.inlineLoader} />
      ) : conditions.length === 0 ? (
        <Text variant="bodyMedium" style={styles.warningText}>
          {t("documents.noPaymentConditions")}
        </Text>
      ) : (
        <View style={styles.chipRow}>
          {conditions.map((condition) => (
            <Chip
              key={condition.condicionPago}
              selected={condicionPago === condition.condicionPago.trim()}
              showSelectedCheck
              // Outlined until chosen: a flat chip picks up the same container
              // colour whether or not it is selected, so every option read as
              // already picked.
              mode={condicionPago === condition.condicionPago.trim() ? "flat" : "outlined"}
              onPress={() => setCondicionPago(condition.condicionPago.trim())}
              // A chip is a tap target, not a label — keep it thumb-sized.
              style={styles.conditionChip}
            >
              {condition.descripcion?.trim() || condition.condicionPago.trim()}
            </Chip>
          ))}
        </View>
      )}
    </View>
  );

  const renderProducts = () => (
    <View style={styles.stepBody}>
      <Button
        mode="contained"
        icon="plus"
        onPress={() => setProductPickerOpen(true)}
        style={styles.addButton}
        contentStyle={styles.addButtonContent}
      >
        {t("documents.addProducts")}
      </Button>

      {cart.isEmpty ? (
        <View style={styles.emptyCart}>
          <Icon source="cart-outline" size={56} color={theme.colors.onSurfaceVariant} />
          <Text variant="titleMedium" style={styles.emptyTitle}>
            {t("documents.emptyCartTitle")}
          </Text>
          <Text variant="bodyMedium" style={styles.emptyBody}>
            {t("documents.emptyCartBody")}
          </Text>
        </View>
      ) : (
        <View style={styles.cartList}>
          {cart.lines.map((line) => (
            <CartLineCard
              key={line.key}
              line={line}
              canEditPrice={canEditPrice}
              onChangeQuantity={(cantidad) => cart.setQuantity(line.key, cantidad)}
              onChangeLine={(patch) => cart.updateLine(line.key, patch)}
              onRemove={() => cart.removeLine(line.key)}
            />
          ))}
        </View>
      )}
    </View>
  );

  const renderReview = () => (
    <View style={styles.stepBody}>
      <AppCard style={styles.summaryCard}>
        <View style={styles.summaryContent}>
          <View style={styles.summaryRow}>
            <Text variant="bodyMedium" style={styles.summaryLabel}>
              {t("documents.documentType")}
            </Text>
            <Text variant="bodyMedium" style={styles.summaryValue}>
              {t(DOCUMENT_TYPE_META[tipoDocumento].labelKey)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text variant="bodyMedium" style={styles.summaryLabel}>
              {t("documents.customer")}
            </Text>
            <Text variant="bodyMedium" style={styles.summaryValue} numberOfLines={1}>
              {customer?.nombre ?? "—"}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text variant="bodyMedium" style={styles.summaryLabel}>
              {t("documents.paymentCondition")}
            </Text>
            <Text variant="bodyMedium" style={styles.summaryValue}>
              {conditions.find((c) => c.condicionPago.trim() === condicionPago)?.descripcion?.trim() ||
                condicionPago ||
                "—"}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text variant="bodyMedium" style={styles.summaryLabel}>
              {t("documents.lines")}
            </Text>
            <Text variant="bodyMedium" style={styles.summaryValue}>
              {cart.lines.length}
            </Text>
          </View>
        </View>
      </AppCard>

      <TextInput
        mode="outlined"
        label={t("documents.note")}
        value={nota}
        onChangeText={setNota}
        multiline
        numberOfLines={3}
        style={styles.noteInput}
      />

      <AppCard variant="inset" style={styles.totalsCard}>
        <View style={styles.summaryContent}>
          <View style={styles.summaryRow}>
            <Text variant="bodyMedium" style={styles.summaryLabel}>
              {t("documents.subtotal")}
            </Text>
            <Text variant="bodyMedium" style={styles.summaryValue}>
              {formatMoney(cart.totals.subTotal)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text variant="bodyMedium" style={styles.summaryLabel}>
              {t("documents.discount")}
            </Text>
            <Text variant="bodyMedium" style={styles.summaryValue}>
              -{formatMoney(cart.totals.descuento)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text variant="bodyMedium" style={styles.summaryLabel}>
              {t("documents.tax")}
            </Text>
            <Text variant="bodyMedium" style={styles.summaryValue}>
              {formatMoney(cart.totals.impuesto)}
            </Text>
          </View>
          <Divider style={styles.totalsDivider} />
          <View style={styles.summaryRow}>
            <Text variant="titleMedium" style={styles.grandTotalLabel}>
              {t("documents.total")}
            </Text>
            <Text variant="titleLarge" style={styles.grandTotal}>
              {formatMoney(cart.totals.total)}
            </Text>
          </View>
        </View>
      </AppCard>

      <Text variant="bodySmall" style={styles.disclaimer}>
        {t("documents.totalsDisclaimer")}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Appbar.Header mode="small" style={styles.appbar}>
        <Appbar.Action
          icon={step === 0 ? "close" : "arrow-left"}
          onPress={() => (step === 0 ? confirmDiscard() : setStep((s) => (s - 1) as Step))}
          disabled={submitting}
        />
        <Appbar.Content title={t("documents.newDocument")} />
        {/* MD3 Appbar.Content ignores `subtitle`, so the step lives beside the
            title where it is actually visible. */}
        <Text variant="labelLarge" style={styles.stepLabel}>
          {t("documents.stepOf", { current: step + 1, total: STEP_COUNT })}
        </Text>
      </Appbar.Header>
      {/* Paper's ProgressBar wraps itself in a `height: 100%` container on web, so
          unwrapped it stretches to the full screen and pushes the form out of
          view. The fixed-height track is what keeps it a 4px rule. */}
      <View style={styles.progressTrack}>
        <ProgressBar progress={(step + 1) / STEP_COUNT} />
      </View>

      {!!error && (
        <Banner visible icon="alert-circle-outline">
          {error}
        </Banner>
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {step === 0 && renderTypeAndCustomer()}
          {step === 1 && renderProducts()}
          {step === 2 && renderReview()}
        </ScrollView>

        <View style={styles.bottomBar}>
          {!cart.isEmpty && step !== 2 && (
            <View style={styles.bottomSummary}>
              <Text variant="bodySmall" style={styles.bottomSummaryLabel}>
                {t("documents.lineCount", { count: cart.lines.length })}
              </Text>
              <Text variant="titleMedium" style={styles.bottomSummaryTotal}>
                {formatMoney(cart.totals.total)}
              </Text>
            </View>
          )}

          <Button
            mode="contained"
            onPress={() => (step === 2 ? handleSubmit() : setStep((s) => (s + 1) as Step))}
            disabled={!stepValid || submitting}
            loading={submitting}
            style={styles.primaryAction}
            contentStyle={styles.primaryActionContent}
            icon={step === 2 ? "check" : undefined}
          >
            {step === 2 ? t("documents.confirmAndSave") : t("common.next")}
          </Button>
        </View>
      </KeyboardAvoidingView>

      <CustomerPickerModal
        visible={customerPickerOpen}
        onDismiss={() => setCustomerPickerOpen(false)}
        onSelect={handleSelectCustomer}
      />

      <ProductPickerModal
        visible={productPickerOpen}
        onDismiss={() => setProductPickerOpen(false)}
        onSelect={(product) => cart.addProduct(product)}
        selectedCodes={cart.lines.map((l) => l.codigoProducto)}
      />
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
    progressTrack: {
      height: 4,
    },
    stepLabel: {
      color: theme.colors.onSurfaceVariant,
      marginRight: 16,
    },
    appbar: {
      backgroundColor: theme.colors.surface,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 32,
      flexGrow: 1,
    },
    stepBody: {
      gap: 14,
    },
    typeRow: {
      flexDirection: "row",
      gap: 10,
    },
    typeCard: {
      flex: 1,
      borderRadius: theme.custom.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surface,
      overflow: "hidden",
    },
    typeCardInner: {
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      // Big enough to hit without aiming.
      minHeight: 88,
      paddingVertical: 12,
      paddingHorizontal: 4,
    },
    typeLabel: {
      color: theme.colors.onSurfaceVariant,
      textAlign: "center",
    },
    selectorInner: {
      minHeight: 72,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
    },
    selectorIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: theme.colors.primaryContainer,
      alignItems: "center",
      justifyContent: "center",
    },
    selectorBody: {
      flex: 1,
      gap: 2,
    },
    selectorTitle: {
      color: theme.colors.onSurface,
      fontWeight: "600",
    },
    selectorMeta: {
      color: theme.colors.onSurfaceVariant,
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    conditionChip: {
      borderRadius: 12,
      minHeight: 44,
      justifyContent: "center",
    },
    inlineLoader: {
      alignSelf: "flex-start",
    },
    warningText: {
      color: theme.colors.error,
    },
    addButton: {
      borderRadius: 12,
    },
    addButtonContent: {
      height: 52,
    },
    cartList: {
      gap: 10,
    },
    emptyCart: {
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 48,
      paddingHorizontal: 24,
    },
    emptyTitle: {
      color: theme.colors.onSurface,
      fontWeight: "600",
      textAlign: "center",
    },
    emptyBody: {
      color: theme.colors.onSurfaceVariant,
      textAlign: "center",
    },
    summaryCard: {
      marginBottom: 2,
    },
    summaryContent: {
      gap: 8,
      padding: 16,
    },
    summaryRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    summaryLabel: {
      color: theme.colors.onSurfaceVariant,
    },
    summaryValue: {
      color: theme.colors.onSurface,
      fontWeight: "600",
      flexShrink: 1,
      textAlign: "right",
    },
    noteInput: {
      backgroundColor: theme.colors.surface,
    },
    totalsCard: {
      marginTop: 2,
    },
    totalsDivider: {
      marginVertical: 4,
    },
    grandTotalLabel: {
      color: theme.colors.onSurface,
      fontWeight: "700",
    },
    grandTotal: {
      color: theme.colors.primary,
      fontWeight: "800",
    },
    disclaimer: {
      color: theme.colors.onSurfaceVariant,
      textAlign: "center",
      paddingHorizontal: 8,
    },
    bottomBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 16,
      borderTopWidth: theme.custom.hairline,
      borderTopColor: theme.colors.outlineVariant,
      backgroundColor: theme.colors.surface,
    },
    bottomSummary: {
      gap: 2,
    },
    bottomSummaryLabel: {
      color: theme.colors.onSurfaceVariant,
    },
    bottomSummaryTotal: {
      color: theme.colors.onSurface,
      fontWeight: "700",
    },
    primaryAction: {
      flex: 1,
      borderRadius: 12,
    },
    primaryActionContent: {
      height: 52,
    },
  });

export default DocumentCreateScreen;
