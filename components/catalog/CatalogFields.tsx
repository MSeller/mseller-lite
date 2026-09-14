import React from "react";
import { StyleSheet, View } from "react-native";
import {
  HelperText,
  SegmentedButtons,
  Switch,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";

import type { CustomTheme } from "../../constants/Theme";
import { useTranslation } from "../../hooks/useTranslation";
import type { CatalogStatus } from "../../types/catalog";
import type { ValidationCode } from "../../utils/catalogValidation";
import AppCard from "../ui/AppCard";
import SectionHeader from "../ui/SectionHeader";

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

type TextInputProps = React.ComponentProps<typeof TextInput>;

interface FormFieldProps
  extends Pick<
    TextInputProps,
    "autoCapitalize" | "keyboardType" | "inputMode" | "multiline" | "maxLength" | "right" | "autoCorrect"
  > {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  /** Validation code, shown translated under the field. */
  error?: ValidationCode;
  disabled?: boolean;
}

/** An outlined text input with its validation message underneath. */
export const FormField: React.FC<FormFieldProps> = ({ label, error, disabled, ...inputProps }) => {
  const theme = useTheme() as CustomTheme;
  const { t } = useTranslation();

  return (
    <View>
      <TextInput
        mode="outlined"
        label={label}
        error={!!error}
        disabled={disabled}
        style={{ backgroundColor: theme.colors.surface }}
        {...inputProps}
      />
      {!!error && (
        <HelperText type="error" visible style={styles.helper}>
          {t(`catalog.validation.${error}`)}
        </HelperText>
      )}
    </View>
  );
};

/** Looks like a text field, opens a picker. The input itself never takes focus. */
export const SelectField: React.FC<{
  label: string;
  value: string;
  onPress: () => void;
  disabled?: boolean;
}> = ({ label, value, onPress, disabled }) => {
  const theme = useTheme() as CustomTheme;

  return (
    <TouchableRipple
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      borderless
      style={styles.select}
    >
      <View pointerEvents="none">
        <TextInput
          mode="outlined"
          label={label}
          value={value}
          editable={false}
          disabled={disabled}
          style={{ backgroundColor: theme.colors.surface }}
          right={<TextInput.Icon icon="menu-down" />}
        />
      </View>
    </TouchableRipple>
  );
};

/** A numeric input: decimal keyboard, no autocorrect. */
export const NumberField: React.FC<Omit<FormFieldProps, "keyboardType" | "inputMode">> = (props) => (
  <FormField keyboardType="decimal-pad" inputMode="decimal" autoCorrect={false} {...props} />
);

/** Activo / Inactivo. */
export const StatusField: React.FC<{
  value: CatalogStatus;
  onChange: (value: CatalogStatus) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => {
  const theme = useTheme() as CustomTheme;
  const { t } = useTranslation();

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
}> = ({ label, value, onChange, disabled }) => {
  const theme = useTheme() as CustomTheme;

  return (
    <TouchableRipple
      onPress={() => onChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      style={styles.switchRow}
    >
      <View style={styles.switchInner}>
        <Text variant="bodyLarge" style={[styles.switchLabel, { color: theme.colors.onSurface }]}>
          {label}
        </Text>
        <Switch value={value} onValueChange={onChange} disabled={disabled} />
      </View>
    </TouchableRipple>
  );
};

/** Two inputs side by side, for short numbers that belong together. */
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
  select: {
    borderRadius: 4,
  },
  helper: {
    paddingHorizontal: 4,
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
