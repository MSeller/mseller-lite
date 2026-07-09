import { Stack } from "expo-router";
import React from "react";
import { useTheme } from "react-native-paper";
import { useTranslation } from "@/hooks/useTranslation";

export default function RutaEntregaLayout() {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.primary,
        headerTitleStyle: { color: theme.colors.onSurface },
      }}
    >
      <Stack.Screen name="index" options={{ title: t("entrega.routeDetailTitle") }} />
      <Stack.Screen name="carga" options={{ title: t("entrega.loadTruck") }} />
      <Stack.Screen
        name="factura/[noPedidoStr]"
        options={{ title: t("entrega.deliveryDetailTitle") }}
      />
    </Stack>
  );
}
