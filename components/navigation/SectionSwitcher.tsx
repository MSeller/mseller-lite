import React from "react";
import { StyleSheet, View } from "react-native";
import { SegmentedButtons } from "react-native-paper";

export interface SectionOption<T extends string> {
  value: T;
  label: string;
  icon: string;
}

interface SectionSwitcherProps<T extends string> {
  sections: SectionOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * The switch between the modules that share one bottom tab (Rutas: Preparación /
 * Entregas; Inventario: Conteo / Productos). With a single module there is nothing
 * to switch, so it renders nothing and that module simply fills the tab.
 */
export default function SectionSwitcher<T extends string>({
  sections,
  value,
  onChange,
}: SectionSwitcherProps<T>) {
  if (sections.length < 2) {
    return null;
  }

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={value}
        onValueChange={(next) => onChange(next as T)}
        buttons={sections.map((section) => ({
          value: section.value,
          label: section.label,
          icon: section.icon,
          accessibilityLabel: section.label,
        }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
});
