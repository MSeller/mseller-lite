import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { IconButton, Text, TextInput, useTheme } from "react-native-paper";

import type { CustomTheme } from "../../../constants/Theme";
import { useTranslation } from "../../../hooks/useTranslation";
import type { CartLine } from "../../../types/documents";
import {
  calculateLineTotals,
  formatMoney,
  formatQuantity,
  formatUnitWithFactor,
  parseNumericInput,
  productDisplayName,
} from "../../../utils/documentFormat";

interface Props {
  line: CartLine;
  /** Page gutter of the screen the row sits in (16 phone, 28 tablet). */
  gutter: number;
  canEditPrice: boolean;
  expanded: boolean;
  onToggle: () => void;
  onChangeQuantity: (cantidad: number) => void;
  onChangeLine: (patch: Partial<CartLine>) => void;
  onRemove: () => void;
}

/**
 * One captured line, as the iOS Pedido row: quantity and unit on the left, the
 * product in the middle, unit price over line total on the right, full bleed
 * with a hairline under it.
 *
 * Tapping the row opens its editor in place — stepper, price, discount, remove —
 * so the list stays a clean read of the order and the controls show up only on
 * the line being changed.
 */
const CartLineRow: React.FC<Props> = ({
  line,
  gutter,
  canEditPrice,
  expanded,
  onToggle,
  onChangeQuantity,
  onChangeLine,
  onRemove,
}) => {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const [quantityText, setQuantityText] = useState(formatQuantity(line.cantidad));
  const [priceText, setPriceText] = useState(String(line.precio));
  const [discountText, setDiscountText] = useState(String(line.porcientoDescuento));

  // The quantity field is a draft the user is mid-edit on, so it can't simply
  // mirror the prop. But the line can also change from OUTSIDE this row —
  // re-tapping the same product in the still-open picker bumps its quantity — and
  // a draft left showing the old number would be committed on the next blur,
  // silently undoing that tap. Re-sync whenever the committed value moves away
  // from what this field last sent.
  const lastCommitted = useRef(line.cantidad);
  useEffect(() => {
    if (line.cantidad !== lastCommitted.current) {
      lastCommitted.current = line.cantidad;
      setQuantityText(formatQuantity(line.cantidad));
    }
  }, [line.cantidad]);

  const totals = useMemo(() => calculateLineTotals(line), [line]);
  const priceChanged = line.precio !== line.precioLista;
  const name = productDisplayName(line.descripcion);
  const unit = line.unidad?.trim().toUpperCase() || "";
  // A case of 12 priced at $145.50 totals $1,746 — without the factor on screen
  // that reads as a bug rather than a case price.
  const packing = line.factor > 1 ? formatUnitWithFactor(line.unidad, line.factor) : "";

  // Every field commits as it is typed, not only on blur: the editor can be collapsed (tapping
  // another row) or the order saved from the header while a field still has focus, and
  // neither fires onBlur — the typed value would be lost or saved stale.
  const changeQuantity = (text: string) => {
    setQuantityText(text);
    const value = parseNumericInput(text);
    // A transient 0 ("0" on the way to "0.5") must not remove the line; only blur may.
    if (value > 0) {
      lastCommitted.current = value;
      onChangeQuantity(value);
    }
  };

  const changePrice = (text: string) => {
    setPriceText(text);
    onChangeLine({ precio: parseNumericInput(text) });
  };

  const changeDiscount = (text: string) => {
    setDiscountText(text);
    onChangeLine({ porcientoDescuento: Math.min(100, Math.max(0, parseNumericInput(text))) });
  };

  const commitQuantity = () => {
    const value = parseNumericInput(quantityText);
    lastCommitted.current = value;
    onChangeQuantity(value);
    // Re-sync from the committed value so a typo like "3..5" doesn't linger.
    setQuantityText(formatQuantity(value > 0 ? value : line.cantidad));
  };

  const step = (delta: number) => {
    const next = Math.max(0, line.cantidad + delta);
    lastCommitted.current = next;
    setQuantityText(formatQuantity(next));
    onChangeQuantity(next);
  };

  const meta = [
    `SKU ${line.codigoProducto}`,
    packing,
    line.porcientoImpuesto ? t("documents.taxShort", { value: line.porcientoImpuesto }) : "",
  ].filter(Boolean);

  return (
    <View style={[styles.container, expanded && styles.containerExpanded]}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [styles.row, { paddingHorizontal: gutter }, pressed && styles.rowPressed]}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={t("documents.lineSummary", {
          quantity: formatQuantity(line.cantidad),
          unit,
          name,
          price: formatMoney(line.precio),
          total: formatMoney(totals.total),
        })}
        accessibilityHint={t("documents.lineEditHint")}
      >
        <View style={styles.quantityColumn}>
          <Text style={styles.quantity}>{formatQuantity(line.cantidad)}</Text>
          {!!unit && (
            <Text style={styles.unit} numberOfLines={1}>
              {unit}
            </Text>
          )}
        </View>

        <View style={styles.nameColumn}>
          <Text style={styles.name} numberOfLines={3}>
            {name}
          </Text>
          <Text style={styles.meta}>
            {meta.join(" · ")}
            {line.porcientoDescuento > 0 && (
              <Text style={styles.offer}>{`  •  -${formatQuantity(line.porcientoDescuento)}%`}</Text>
            )}
          </Text>
        </View>

        <View style={styles.amountColumn}>
          <Text style={styles.price}>
            {formatMoney(line.precio)}
            {priceChanged ? "*" : ""}
            {!!unit && <Text style={styles.priceUnit}>{` /${unit}`}</Text>}
          </Text>
          <Text style={styles.lineTotal}>{formatMoney(totals.total)}</Text>
        </View>
      </Pressable>

      {expanded && (
        <View style={[styles.editor, { paddingHorizontal: gutter }]}>
          <View style={styles.stepperRow}>
            <IconButton
              icon="minus"
              mode="contained-tonal"
              size={22}
              onPress={() => step(-1)}
              style={styles.stepperButton}
              accessibilityLabel={t("documents.decreaseQuantity")}
            />
            <TextInput
              mode="outlined"
              value={quantityText}
              onChangeText={changeQuantity}
              onBlur={commitQuantity}
              onSubmitEditing={commitQuantity}
              keyboardType="decimal-pad"
              inputMode="decimal"
              dense
              style={styles.quantityInput}
              contentStyle={styles.quantityInputContent}
              accessibilityLabel={t("documents.quantity")}
            />
            <IconButton
              icon="plus"
              mode="contained-tonal"
              size={22}
              onPress={() => step(1)}
              style={styles.stepperButton}
              accessibilityLabel={t("documents.increaseQuantity")}
            />
            <View style={styles.flex} />
            <IconButton
              icon="trash-can-outline"
              iconColor={theme.custom.colors.destructive}
              size={22}
              onPress={onRemove}
              style={styles.stepperButton}
              accessibilityLabel={t("documents.removeLine")}
            />
          </View>

          <View style={styles.priceRow}>
            <TextInput
              mode="outlined"
              label={t("documents.unitPrice")}
              value={priceText}
              onChangeText={changePrice}
              keyboardType="decimal-pad"
              inputMode="decimal"
              disabled={!canEditPrice}
              style={styles.priceInput}
              right={
                priceChanged ? (
                  <TextInput.Icon
                    icon="restore"
                    onPress={() => {
                      setPriceText(String(line.precioLista));
                      onChangeLine({ precio: line.precioLista });
                    }}
                    accessibilityLabel={t("documents.restoreListPrice")}
                  />
                ) : null
              }
            />
            <TextInput
              mode="outlined"
              label={t("documents.discountPercent")}
              value={discountText}
              onChangeText={changeDiscount}
              // A discount IS a price concession: gating the price field but not
              // this one let a seller without the permission reach the same
              // result by another route.
              disabled={!canEditPrice}
              // Shows the clamped value once the seller is done ("150" reads back as 100).
              onBlur={() => setDiscountText(String(line.porcientoDescuento))}
              keyboardType="decimal-pad"
              inputMode="decimal"
              style={styles.priceInput}
            />
          </View>
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: CustomTheme) => {
  const { colors, spacing, type, radius, hairline, touchTarget } = theme.custom;
  return StyleSheet.create({
    container: {
      borderBottomWidth: hairline,
      borderBottomColor: colors.hairline,
    },
    containerExpanded: {
      backgroundColor: colors.surfaceRaised,
    },
    flex: {
      flex: 1,
    },
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.md,
      paddingVertical: spacing.lg,
      minHeight: touchTarget,
    },
    rowPressed: {
      backgroundColor: colors.surfaceRaised,
    },
    quantityColumn: {
      width: 44,
      gap: spacing.xs,
    },
    quantity: {
      ...type.figure(17),
    },
    unit: {
      ...type.overline,
      fontSize: type.caption.fontSize,
    },
    nameColumn: {
      flex: 1,
      gap: spacing.xs,
    },
    name: {
      ...type.rowTitle,
    },
    meta: {
      ...type.caption,
    },
    offer: {
      ...type.caption,
      color: colors.offer,
      fontWeight: "600",
    },
    amountColumn: {
      alignItems: "flex-end",
      gap: spacing.xs,
      maxWidth: "40%",
    },
    price: {
      ...type.figure(17),
      textAlign: "right",
    },
    priceUnit: {
      ...type.caption,
      fontWeight: "400",
    },
    lineTotal: {
      ...type.caption,
      fontVariant: ["tabular-nums"],
    },
    editor: {
      gap: spacing.md,
      paddingBottom: spacing.lg,
    },
    stepperRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    stepperButton: {
      margin: 0,
      width: touchTarget,
      height: touchTarget,
      borderRadius: radius.control,
    },
    quantityInput: {
      width: 84,
      backgroundColor: colors.background,
    },
    quantityInputContent: {
      ...type.figure(17),
      textAlign: "center",
    },
    priceRow: {
      flexDirection: "row",
      gap: spacing.md,
    },
    priceInput: {
      flex: 1,
      backgroundColor: colors.background,
    },
  });
};

export default CartLineRow;
