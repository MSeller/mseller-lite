import React, { createContext, useContext } from "react";
import { StyleSheet, View } from "react-native";
import { SegmentedButtons, Switch, Text, TouchableRipple, useTheme } from "react-native-paper";

import type { CustomTheme } from "../../constants/Theme";
import { useTranslation } from "../../hooks/useTranslation";
import type { CatalogStatus } from "../../types/catalog";
import AppCard from "../ui/AppCard";
import FormField, { type FormFieldProps } from "../ui/FormField";
import SectionHeader from "../ui/SectionHeader";

/**
 * Layout and the few inputs only the catalog forms need. Text inputs and selects are
 * the app's shared `FormField` and `SelectField`; these wrap them for a white card.
 */

/**
 * True while the form is saving. `CatalogEditScaffold` provides it, and every field here
 * reads it, so nothing typed during the request is silently dropped when the form closes.
 */
export const CatalogFormLocked = createContext(false);

/** A field is disabled when it asks to be or while its form is saving. */
const useFieldDisabled = (disabled?: boolean) => useContext(CatalogFormLocked) || !!disabled;

/** A titled card that groups related inputs in an edit form. */
export const FieldGroup: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <View style={styles.group}>
    <SectionHeader title={title} />
    <AppCard contentStyle={styles.groupContent}>{children}</AppCard>
  </View>
);

/**
 * `FormField` on a card: the outlined input takes the card's surface instead of the
 * page tone, as the document form's new-customer inputs do.
 */
export const CardField: React.FC<FormFieldProps> = ({ style, disabled, ...props }) => {
  const theme = useTheme() as CustomTheme;
  const locked = useFieldDisabled(disabled);
  return <FormField style={[{ backgroundColor: theme.colors.surface }, style]} disabled={locked} {...props} />;
};

/** A numeric `CardField`: decimal keyboard, no autocorrect. */
export const NumberField: React.FC<Omit<FormFieldProps, "keyboardType" | "inputMode">> = (props) => (
  <CardField keyboardType="decimal-pad" inputMode="decimal" autoCorrect={false} {...props} />
);

/** Activo / Inactivo. */
export const StatusField: React.FC<{
  value: CatalogStatus;
  onChange: (value: CatalogStatus) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled: disabledProp }) => {
  const theme = useTheme() as CustomTheme;
  const { t } = useTranslation();
  const disabled = useFieldDisabled(disabledProp);

  return (
    <View style={styles.statusField}>
      <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
        {t("catalog.status")}
      </Text>
      <SegmentedButtons
        value={value}
        onValueChange={(next) => onChange(next as CatalogStatus)}
        // Selected segment in the brand tone, as in the documents filter, so it reads
        // as a choice rather than a status colour.
        theme={{
          colors: {
            secondaryContainer: theme.colors.primaryContainer,
            onSecondaryContainer: theme.colors.onPrimaryContainer,
          },
        }}
        buttons={[
          { value: "A", label: t("catalog.active"), icon: "check-circle-outline", disabled },
          { value: "I", label: t("catalog.inactive"), icon: "cancel", disabled },
        ]}
      />
    </View>
  );
};

/** A boolean as a full-width row with a switch; the whole row toggles it. */
export const SwitchField: React.FC<{
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}> = ({ label, value, onChange, disabled: disabledProp }) => {
  const theme = useTheme() as CustomTheme;
  const disabled = useFieldDisabled(disabledProp);

  return (
    // One control for assistive technology: the row is the switch, with its label and
    // checked state; the Switch inside is only its visual and is hidden from the tree.
    <TouchableRipple
      onPress={() => onChange(!value)}
      disabled={disabled}
      accessible
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      style={styles.switchRow}
    >
      <View style={styles.switchInner}>
        <Text variant="bodyLarge" style={[styles.switchLabel, { color: theme.colors.onSurface }]}>
          {label}
        </Text>
        <View accessible={false} importantForAccessibility="no-hide-descendants">
          <Switch value={value} onValueChange={onChange} disabled={disabled} accessible={false} />
        </View>
      </View>
    </TouchableRipple>
  );
};

/** Two inputs side by side, for short values that belong together. */
export const FieldRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.fieldRow}>
    {React.Children.map(children, (child) => (
      <View style={styles.fieldRowItem}>{child}</View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  group: {
    marginBottom: 16,
  },
  groupContent: {
    padding: 14,
    gap: 10,
  },
  statusField: {
    gap: 8,
    marginTop: 4,
  },
  switchRow: {
    borderRadius: 10,
    minHeight: 48,
    justifyContent: "center",
  },
  switchInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 6,
  },
  switchLabel: {
    flex: 1,
  },
  fieldRow: {
    flexDirection: "row",
    gap: 10,
  },
  fieldRowItem: {
    flex: 1,
  },
});
