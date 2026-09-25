import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { ActivityIndicator, Icon, IconButton, Menu, Text, TextInput, useTheme } from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { gutterFor, type CustomTheme } from "../../../constants/Theme";
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
import BrandGradient from "../../ui/BrandGradient";
import { DOCUMENT_TYPE_META } from "../documentMeta";
import CartLineRow from "./CartLineRow";
import CustomerPickerModal from "./CustomerPickerModal";
import ProductPickerModal from "./ProductPickerModal";

/** Makes a retry safe if the network drops after the server already committed. */
const newIdempotencyKey = () =>
  `lite-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * Capture an invoice, order or quote on ONE screen, laid out like the iOS app's
 * Pedido (`DocumentViewController.swift`): the document type as an overline menu,
 * the customer as the title, payment terms on the brand card, the lines, and a
 * pinned total with "Agregar". "Guardar" in the header saves.
 *
 * One screen rather than a wizard because a seller builds an order in any
 * order — adds products, then remembers the customer, then changes the terms —
 * and everything that decides the total stays in view while they do.
 *
 * Online only. There is no draft queue behind this screen, so a failed save
 * keeps the user on the form with everything still filled in rather than
 * claiming success and losing the work.
 */
const DocumentCreateScreen: React.FC = () => {
  const theme = useTheme() as CustomTheme;
  // Android draws edge to edge: the system navigation bar overlaps the bottom of the screen.
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const gutter = gutterFor(width);
  const styles = useMemo(() => createStyles(theme, gutter), [theme, gutter]);
  const { colors } = theme.custom;
  const { t } = useTranslation();
  const router = useRouter();
  const { userProfile } = useUser();

  const cart = useDocumentCart();

  const [tipoDocumento, setTipoDocumento] = useState<DocumentType>("invoice");
  const [customer, setCustomer] = useState<CustomerSummary | null>(null);
  const [condicionPago, setCondicionPago] = useState<string | null>(null);
  const [nota, setNota] = useState("");

  const [conditions, setConditions] = useState<PaymentCondition[]>([]);
  const [conditionsLoading, setConditionsLoading] = useState(true);
  const [conditionsError, setConditionsError] = useState(false);

  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [conditionMenuOpen, setConditionMenuOpen] = useState(false);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [expandedLine, setExpandedLine] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  // Held for the whole screen: a retry after an ambiguous failure must reuse the
  // same key, or the retry is what creates the duplicate.
  const [idempotencyKey] = useState(newIdempotencyKey);

  const canEditPrice = userProfile?.editPrice ?? false;

  // A tenant with no payment conditions and an API that could not be reached are
  // different situations, and collapsing both into an empty list strands the seller:
  // the card shows "no conditions", Guardar stays disabled, and there is nothing to
  // retry short of leaving the screen. `listPaymentConditions` already maps a 404 to
  // an empty catalogue, so anything reaching this catch is a real failure.
  const loadConditions = useCallback(async () => {
    setConditionsLoading(true);
    try {
      setConditions(await listPaymentConditions());
      setConditionsError(false);
    } catch {
      setConditions([]);
      setConditionsError(true);
    } finally {
      setConditionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConditions();
  }, [loadConditions]);

  const handleSelectCustomer = useCallback((selected: CustomerSummary) => {
    setCustomer(selected);
    // The customer's own condition is the right default — it is what the portal
    // would use — but it stays overridable for a one-off cash sale.
    //
    // Cleared rather than carried over when the new customer has none: keeping the
    // previous customer's terms would quietly bill this one on someone else's
    // credit. Nothing selected keeps Guardar disabled, which is the honest state.
    setCondicionPago(selected.condicionPago?.trim() || null);
  }, []);

  // A customer can carry a condition code the tenant has since removed. Left as is
  // it would show a condition nobody can pick and fail only at save with a message
  // about a code the user never chose — so reconcile against the catalogue once
  // it is known.
  useEffect(() => {
    if (conditionsLoading || !condicionPago) return;
    const existe = conditions.some((c) => c.condicionPago.trim() === condicionPago);
    if (!existe) setCondicionPago(null);
  }, [conditions, conditionsLoading, condicionPago]);

  // Waits for the catalogue: until it loads, the reconcile effect above has not had the chance
  // to clear a customer's condition the tenant has since removed.
  const canSave =
    !cart.isEmpty && !!customer && !!condicionPago && !conditionsLoading && !submitting;
  const dirty = !cart.isEmpty || !!customer || !!nota.trim();

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
    if (!dirty) {
      router.back();
      return;
    }
    Alert.alert(t("documents.discardTitle"), t("documents.discardBody"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("documents.discardConfirm"), style: "destructive", onPress: () => router.back() },
    ]);
  }, [dirty, router, t]);

  const conditionLabel = (code: string | null) =>
    conditions.find((c) => c.condicionPago.trim() === code)?.descripcion?.trim() || code || "";

  const customerLine = customer
    ? [[customer.direccion, customer.ciudad].filter((s) => s?.trim()).join(", "), `#${customer.codigo}`]
        .filter(Boolean)
        .join(" · ")
    : t("documents.selectCustomerHint");

  // ── Sections ─────────────────────────────────────────────────────────────

  const renderPaymentCard = () => (
    <BrandGradient raised style={styles.paymentCard}>
      <View style={styles.paymentTop}>
        <Text style={styles.paymentOverline}>{t("documents.paymentCondition")}</Text>
        {conditionsLoading ? (
          <ActivityIndicator color={colors.onGradient} style={styles.paymentLoader} />
        ) : conditionsError ? (
          <View style={styles.paymentProblem}>
            <Text style={styles.paymentAlert}>{t("documents.errors.paymentConditionsFailed")}</Text>
            <Pressable onPress={loadConditions} hitSlop={8} accessibilityRole="button">
              <Text style={styles.paymentAction}>{t("common.retry")}</Text>
            </Pressable>
          </View>
        ) : conditions.length === 0 ? (
          <Text style={styles.paymentAlert}>{t("documents.noPaymentConditions")}</Text>
        ) : (
          <Menu
            visible={conditionMenuOpen}
            onDismiss={() => setConditionMenuOpen(false)}
            anchor={
              <Pressable
                onPress={() => setConditionMenuOpen(true)}
                style={styles.paymentValueRow}
                accessibilityRole="button"
                accessibilityLabel={`${t("documents.paymentCondition")}: ${
                  conditionLabel(condicionPago) || t("documents.selectPaymentCondition")
                }`}
                accessibilityHint={t("documents.changePaymentCondition")}
              >
                <Text style={styles.paymentValue} numberOfLines={2}>
                  {condicionPago ? conditionLabel(condicionPago) : t("documents.selectPaymentCondition")}
                </Text>
                <Icon source="unfold-more-horizontal" size={22} color={colors.onGradient} />
              </Pressable>
            }
          >
            {conditions.map((condition) => {
              const code = condition.condicionPago.trim();
              return (
                <Menu.Item
                  key={code}
                  title={condition.descripcion?.trim() || code}
                  leadingIcon={condicionPago === code ? "check" : undefined}
                  onPress={() => {
                    setCondicionPago(code);
                    setConditionMenuOpen(false);
                  }}
                />
              );
            })}
          </Menu>
        )}
      </View>

      {!!customer && (
        <View style={styles.paymentBottom}>
          <Text style={styles.paymentOverline}>{t("documents.balance")}</Text>
          <Text style={styles.paymentFigure} numberOfLines={1} adjustsFontSizeToFit>
            {formatMoney(customer.balance ?? 0)}
          </Text>
        </View>
      )}
    </BrandGradient>
  );

  const renderLines = () =>
    cart.isEmpty ? (
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <Icon source="cart-outline" size={28} color={colors.tint} />
        </View>
        <Text style={styles.emptyTitle}>{t("documents.emptyCartTitle")}</Text>
        <Text style={styles.emptyBody}>{t("documents.emptyCartBody")}</Text>
        <Pressable
          onPress={() => setProductPickerOpen(true)}
          style={styles.quickAction}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Icon source="magnify" size={20} color={colors.tint} />
          <Text style={styles.quickActionLabel}>{t("documents.addProducts")}</Text>
        </Pressable>
      </View>
    ) : (
      cart.lines.map((line) => (
        <CartLineRow
          key={line.key}
          line={line}
          gutter={gutter}
          canEditPrice={canEditPrice}
          expanded={expandedLine === line.key}
          onToggle={() => setExpandedLine((k) => (k === line.key ? null : line.key))}
          onChangeQuantity={(cantidad) => cart.setQuantity(line.key, cantidad)}
          onChangeLine={(patch) => cart.updateLine(line.key, patch)}
          onRemove={() => cart.removeLine(line.key)}
        />
      ))
    );

  const renderTotals = () => (
    <View style={styles.totals}>
      {[
        { label: t("documents.subtotal"), value: formatMoney(cart.totals.subTotal) },
        { label: t("documents.discount"), value: `-${formatMoney(cart.totals.descuento)}` },
        { label: t("documents.tax"), value: formatMoney(cart.totals.impuesto) },
      ].map((row) => (
        <View key={row.label} style={styles.totalRow}>
          <Text style={styles.totalLabel}>{row.label}</Text>
          <Text style={styles.totalValue}>{row.value}</Text>
        </View>
      ))}
      <Text style={styles.disclaimer}>{t("documents.totalsDisclaimer")}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <IconButton
          icon="close"
          iconColor={colors.tint}
          onPress={confirmDiscard}
          disabled={submitting}
          accessibilityLabel={t("common.close")}
          style={styles.headerButton}
        />
        <View style={styles.flex} />
        {dirty && !submitting && (
          <View
            style={styles.unsavedDot}
            accessible
            accessibilityLabel={t("documents.unsavedChanges")}
          />
        )}
        {submitting ? (
          <ActivityIndicator color={colors.ink} style={styles.saveSpinner} />
        ) : (
          <Pressable
            onPress={handleSubmit}
            disabled={!canSave}
            hitSlop={8}
            style={styles.saveButton}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSave }}
            accessibilityHint={canSave ? undefined : t("documents.saveRequirements")}
          >
            <Text style={[styles.saveLabel, !canSave && styles.saveLabelDisabled]}>
              {t("common.save")}
            </Text>
          </Pressable>
        )}
      </View>

      {!!error && (
        <View style={styles.errorStrip} accessibilityRole="alert">
          <Icon source="alert-circle-outline" size={20} color={colors.warningForeground} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <Menu
              visible={typeMenuOpen}
              onDismiss={() => setTypeMenuOpen(false)}
              anchor={
                <Pressable
                  onPress={() => setTypeMenuOpen(true)}
                  style={styles.typeAnchor}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`${t(DOCUMENT_TYPE_META[tipoDocumento].labelKey)}, ${t(
                    "documents.status.borrador"
                  )}`}
                  accessibilityHint={t("documents.changeType")}
                >
                  <Text style={styles.typeLabel}>
                    {`${t(DOCUMENT_TYPE_META[tipoDocumento].labelKey)} · ${t("documents.status.borrador")}`}
                  </Text>
                  <Icon source="chevron-down" size={18} color={colors.tint} />
                </Pressable>
              }
            >
              {DOCUMENT_TYPES.map((type) => (
                <Menu.Item
                  key={type}
                  title={t(DOCUMENT_TYPE_META[type].labelKey)}
                  leadingIcon={DOCUMENT_TYPE_META[type].icon}
                  trailingIcon={tipoDocumento === type ? "check" : undefined}
                  onPress={() => {
                    setTipoDocumento(type);
                    setTypeMenuOpen(false);
                  }}
                />
              ))}
            </Menu>

            <Pressable
              onPress={() => setCustomerPickerOpen(true)}
              style={styles.customerRow}
              accessibilityRole="button"
              accessibilityLabel={customer ? customer.nombre : t("documents.selectCustomer")}
              accessibilityHint={customer ? t("documents.changeCustomer") : undefined}
            >
              <Text
                style={[styles.customerName, !customer && styles.customerPlaceholder]}
                numberOfLines={2}
              >
                {customer ? customer.nombre : t("documents.selectCustomer")}
              </Text>
              <Icon source="chevron-right" size={30} color={colors.tint} />
            </Pressable>
            <Text style={styles.customerMeta} numberOfLines={2}>
              {customerLine}
            </Text>

            {renderPaymentCard()}
          </View>

          <View style={styles.itemsHeader}>
            <Text style={styles.overline}>{t("documents.items")}</Text>
            <Text style={styles.itemsCount}>{cart.lines.length}</Text>
          </View>
          <View style={styles.linesTop} />
          {renderLines()}

          <View style={styles.noteSection}>
            <Text style={styles.overline}>{t("documents.note")}</Text>
            <TextInput
              mode="outlined"
              value={nota}
              onChangeText={setNota}
              multiline
              numberOfLines={3}
              style={styles.noteInput}
              accessibilityLabel={t("documents.note")}
            />
          </View>

          {!cart.isEmpty && renderTotals()}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: theme.custom.spacing.md + insets.bottom }]}>
          <View style={styles.flex}>
            <Text style={styles.overline}>
              {t("documents.totalItems", { count: cart.lines.length })}
            </Text>
            <Text style={styles.footerTotal} numberOfLines={1} adjustsFontSizeToFit>
              {formatMoney(cart.totals.total)}
            </Text>
          </View>
          <Pressable
            onPress={() => setProductPickerOpen(true)}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel={t("documents.addProducts")}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <BrandGradient raised style={styles.addButton}>
              <Icon source="plus" size={24} color={colors.onGradient} />
              <Text style={styles.addLabel}>{t("documents.add")}</Text>
            </BrandGradient>
          </Pressable>
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

const createStyles = (theme: CustomTheme, gutter: number) => {
  const { colors, spacing, type, radius, hairline, touchTarget, surface } = theme.custom;
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    flex: {
      flex: 1,
    },
    pressed: {
      opacity: 0.85,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingLeft: gutter - spacing.sm,
      paddingRight: gutter,
      minHeight: touchTarget + spacing.sm,
      gap: spacing.sm,
    },
    headerButton: {
      margin: 0,
    },
    unsavedDot: {
      width: spacing.sm,
      height: spacing.sm,
      borderRadius: spacing.xs,
      backgroundColor: colors.unsavedDot,
    },
    saveButton: {
      minHeight: touchTarget,
      justifyContent: "center",
    },
    saveLabel: {
      ...type.rowTitle,
      fontWeight: "700",
    },
    saveLabelDisabled: {
      color: colors.inkTertiary,
    },
    saveSpinner: {
      minHeight: touchTarget,
    },
    errorStrip: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: gutter,
      paddingVertical: spacing.md,
      backgroundColor: colors.warningBackground,
    },
    errorText: {
      ...type.bodySmall,
      color: colors.warningForeground,
      flex: 1,
    },
    scrollContent: {
      paddingBottom: spacing.xxl,
      flexGrow: 1,
    },
    hero: {
      paddingHorizontal: gutter,
      paddingTop: spacing.sm,
      gap: spacing.sm,
    },
    typeAnchor: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: spacing.xs,
      minHeight: touchTarget - spacing.md,
    },
    typeLabel: {
      ...type.overline,
      color: colors.tint,
    },
    customerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    customerName: {
      ...type.largeTitle,
      flexShrink: 1,
    },
    customerPlaceholder: {
      color: colors.tint,
    },
    customerMeta: {
      ...type.bodySmall,
      marginBottom: spacing.md,
    },
    paymentCard: {
      marginBottom: spacing.lg,
    },
    paymentTop: {
      padding: spacing.xl,
      gap: spacing.sm,
    },
    paymentOverline: {
      ...type.overline,
      color: colors.onGradientSecondary,
    },
    paymentValueRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      minHeight: touchTarget,
    },
    paymentValue: {
      ...type.figure(24),
      color: colors.onGradient,
      flexShrink: 1,
    },
    paymentLoader: {
      alignSelf: "flex-start",
      minHeight: touchTarget,
    },
    paymentProblem: {
      gap: spacing.sm,
      alignItems: "flex-start",
    },
    paymentAlert: {
      ...type.bodySmall,
      color: colors.onGradientAlert,
    },
    paymentAction: {
      ...type.rowTitle,
      color: colors.onGradient,
      textDecorationLine: "underline",
    },
    paymentBottom: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      borderTopWidth: hairline,
      borderTopColor: colors.onGradientDivider,
    },
    paymentFigure: {
      ...type.figure(20),
      color: colors.onGradient,
      flexShrink: 1,
    },
    overline: {
      ...type.overline,
    },
    itemsHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: gutter,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
    },
    itemsCount: {
      ...type.figure(13),
    },
    linesTop: {
      height: hairline,
      backgroundColor: colors.hairline,
    },
    empty: {
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.xxl,
      paddingHorizontal: gutter,
      borderBottomWidth: hairline,
      borderBottomColor: colors.hairline,
    },
    // A circle: the radius is half the well's own size (geometry, not a token).
    emptyIcon: {
      width: 56,
      height: 56,
      borderRadius: 56 / 2,
      backgroundColor: colors.tintSoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.xs,
    },
    emptyTitle: {
      ...type.rowTitle,
      textAlign: "center",
    },
    emptyBody: {
      ...type.bodySmall,
      textAlign: "center",
    },
    quickAction: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      minHeight: touchTarget,
    },
    quickActionLabel: {
      ...type.body,
      color: colors.tint,
    },
    noteSection: {
      paddingHorizontal: gutter,
      paddingTop: spacing.xl,
      gap: spacing.sm,
    },
    noteInput: {
      backgroundColor: colors.background,
    },
    totals: {
      paddingHorizontal: gutter,
      paddingTop: spacing.xl,
      gap: spacing.sm,
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    totalLabel: {
      ...type.bodySmall,
    },
    totalValue: {
      ...type.bodySmall,
      color: colors.ink,
      fontVariant: ["tabular-nums"],
    },
    disclaimer: {
      ...type.caption,
      marginTop: spacing.xs,
    },
    footer: {
      ...surface.floating,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.lg,
      paddingHorizontal: gutter,
      paddingTop: spacing.md,
    },
    footerTotal: {
      ...type.figure(28),
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      minHeight: 52,
      paddingHorizontal: spacing.xl,
      borderRadius: radius.control,
    },
    addLabel: {
      ...type.rowTitle,
      color: colors.onGradient,
    },
  });
};

export default DocumentCreateScreen;
