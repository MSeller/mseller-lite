import { Stack } from "expo-router";
import React from "react";
import { useTheme } from "react-native-paper";
import SectionAccessGate from "@/components/navigation/SectionAccessGate";
import type { CustomTheme } from "@/constants/Theme";
import { useTranslation } from "@/hooks/useTranslation";

export default function RutaEntregaLayout() {
  const theme = useTheme() as CustomTheme;
  const { t } = useTranslation();

  // Loading and delivering a route is the assigned driver's job (and the back office's). The
  // Entregas section is hidden for other roles; this covers deep links into a route.
  // Each screen draws its own header (EntregaHeader) so the title can carry the route number.
  return (
    <SectionAccessGate section="deliveries" message={t("entrega.deliveryNotAllowed")}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.custom.colors.background },
        }}
      />
    </SectionAccessGate>
  );
}
