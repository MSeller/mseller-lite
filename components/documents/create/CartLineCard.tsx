import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Divider, IconButton, Text, TextInput, useTheme } from "react-native-paper";

import type { CustomTheme } from "../../../constants/Theme";
import { useTranslation } from "../../../hooks/useTranslation";
import type { CartLine } from "../../../types/documents";
import AppCard from "../../ui/AppCard";
import {
  calculateLineTotals,
  formatMoney,
  formatQuantity,
  formatUnitWithFactor,
  parseNumericInput,
} from "../../../utils/documentFormat";

interface Props {
  line: CartLine;
  canEditPrice: boolean;
  onChangeQuantity: (cantidad: number) => void;
  onChangeLine: (patch: Partial<CartLine>) => void;
  onRemove: () => void;
}

/**
 * One captured line: quantity stepper up front, price and discount behind a
 * disclosure.
 *
 * The stepper is the default because quantity is what changes on nearly every
 * line, and +/- buttons beat raising a keyboard for "make it 3". Price and
 * discount are the exception, so they stay collapsed rather than crowding the
 * row with fields that are usually left alone.
 */
const CartLineCard: React.FC<Props> = ({
  line,
  canEditPrice,
  onChangeQuantity,
  onChangeLine,
  onRemove,
}) => {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const [expanded, setExpanded] = useState(false);
  const [quantityText, setQuantityText] = useState(formatQuantity(line.cantidad));
  const [priceText, setPriceText] = useState(String(line.precio));
  const [discountText, setDiscountText] = useState(String(line.porcientoDescuento));

  const totals = useMemo(() => calculateLineTotals(line), [line]);
  const priceChanged = line.precio !== line.precioLista;
  // A case of 12 priced at $145.50 totals $1,746 — without the factor on screen
  // that reads as a bug rather than a case price.
  const unitLabel = formatUnitWithFactor(line.unidad, line.factor);

  const commitQuantity = () => {
    const value = parseNumericInput(quantityText);
    onChangeQuantity(value);
    // Re-sync from the committed value so a typo like "3..5" doesn't linger.
    setQuantityText(formatQuantity(value > 0 ? value : line.cantidad));
  };

  const step = (delta: number) => {
    const next = Math.max(0, line.cantidad + delta);
    setQuantityText(formatQuantity(next));
    onChangeQuantity(next);
  };

  return (
    <AppCard>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.titleBlock}>
            <Text variant="titleSmall" style={styles.title} numberOfLines={2}>
              {line.descripcion}
            </Text>
            <Text variant="bodySmall" style={styles.subtitle} numberOfLines={1}>
              {line.codigoProducto}
              {unitLabel ? ` · ${unitLabel}` : ""}
              {line.porcientoImpuesto
                ? ` · ${t("documents.taxShort", { value: line.porcientoImpuesto })}`
                : ""}
            </Text>
          </View>

          <IconButton
            icon="close"
            size={22}
            onPress={onRemove}
            accessibilityLabel={t("documents.removeLine")}
            style={styles.removeButton}
          />
        </View>

        <View style={styles.controlsRow}>
          <View style={styles.stepper}>
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
              onChangeText={setQuantityText}
              onBlur={commitQuantity}
              onSubmitEditing={commitQuantity}
              keyboardType="decimal-pad"
              inputMode="decimal"
              dense
              style={styles.quantityInput}
              contentStyle={styles.quantityInputContent}
            />
            <IconButton
              icon="plus"
              mode="contained-tonal"
              size={22}
              onPress={() => step(1)}
              style={styles.stepperButton}
              accessibilityLabel={t("documents.increaseQuantity")}
            />
          </View>

          <View style={styles.amounts}>
            <Text variant="titleMedium" style={styles.lineTotal}>
              {formatMoney(totals.total)}
            </Text>
            <Text variant="bodySmall" style={styles.unitPrice}>
              {formatMoney(line.precio)}
              {line.factor > 1 ? ` × ${formatQuantity(line.factor)}` : ""}
              {line.porcientoDescuento > 0 ? ` · -${line.porcientoDescuento}%` : ""}
              {priceChanged ? " *" : ""}
            </Text>
          </View>
        </View>

        <Divider style={styles.divider} />

        <Button
          mode="text"
          compact
          icon={expanded ? "chevron-up" : "chevron-down"}
          onPress={() => setExpanded((v) => !v)}
          style={styles.expandButton}
          contentStyle={styles.expandButtonContent}
          labelStyle={styles.expandButtonLabel}
        >
          {t("documents.lineOptions")}
        </Button>

        {expanded && (
          <View style={styles.expandedRow}>
            <TextInput
              mode="outlined"
              label={t("documents.unitPrice")}
              value={priceText}
              onChangeText={setPriceText}
              onBlur={() => onChangeLine({ precio: parseNumericInput(priceText) })}
              keyboardType="decimal-pad"
              inputMode="decimal"
              disabled={!canEditPrice}
              style={styles.expandedInput}
              right={
                priceChanged ? (
                  <TextInput.Icon
                    icon="restore"
                    onPress={() => {
                      setPriceText(String(line.precioLista));
                      onChangeLine({ precio: line.precioLista });
                    }}
                  />
                ) : null
              }
            />
            <TextInput
              mode="outlined"
              label={t("documents.discountPercent")}
              value={discountText}
              onChangeText={setDiscountText}
              onBlur={() => {
                const value = Math.min(100, Math.max(0, parseNumericInput(discountText)));
                setDiscountText(String(value));
                onChangeLine({ porcientoDescuento: value });
              }}
              keyboardType="decimal-pad"
              inputMode="decimal"
              style={styles.expandedInput}
            />
          </View>
        )}
      </View>
    </AppCard>
  );
};

const createStyles = (theme: CustomTheme) =>
  StyleSheet.create({
    content: {
      paddingVertical: 12,
      paddingHorizontal: 14,
      gap: 8,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
    },
    titleBlock: {
      flex: 1,
      gap: 2,
    },
    title: {
      color: theme.colors.onSurface,
      fontWeight: "600",
    },
    subtitle: {
      color: theme.colors.onSurfaceVariant,
    },
    removeButton: {
      margin: 0,
      // Keeps the 44px hit area a finger needs even though the glyph is small.
      width: 44,
      height: 44,
    },
    controlsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      flexWrap: "wrap",
    },
    stepper: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    stepperButton: {
      margin: 0,
      width: 48,
      height: 48,
      borderRadius: 12,
    },
    quantityInput: {
      width: 84,
      backgroundColor: theme.colors.surface,
    },
    stepperWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    quantityInputContent: {
      textAlign: "center",
      fontSize: 18,
      fontWeight: "700",
    },
    amounts: {
      alignItems: "flex-end",
      gap: 2,
    },
    lineTotal: {
      color: theme.colors.onSurface,
      fontWeight: "700",
    },
    unitPrice: {
      color: theme.colors.onSurfaceVariant,
    },
    divider: {
      marginTop: 4,
    },
    expandButton: {
      alignSelf: "flex-start",
      marginLeft: -8,
    },
    expandButtonContent: {
      flexDirection: "row-reverse",
      height: 44,
    },
    expandButtonLabel: {
      marginHorizontal: 8,
    },
    expandedRow: {
      flexDirection: "row",
      gap: 12,
    },
    expandedInput: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
  });

export default CartLineCard;
