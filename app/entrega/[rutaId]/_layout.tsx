import { Stack, useRouter } from "expo-router";
import React from "react";
import { IconButton, useTheme } from "react-native-paper";
import { useTranslation } from "@/hooks/useTranslation";

export default function RutaEntregaLayout() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  // The route detail (index) is the root of this nested stack, so the default header back button
  // pops this inner stack — which has nothing below it — and appears to do nothing. Pop the root
  // history instead (returns to the routes/transport list), falling back to the list explicitly.
  const backToList = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/entrega");
  };

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.primary,
        headerTitleStyle: { color: theme.colors.onSurface },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: t("entrega.routeDetailTitle"),
          headerLeft: () => (
            <IconButton
              icon="arrow-left"
              size={24}
              iconColor={theme.colors.primary}
              onPress={backToList}
              style={{ margin: 0, marginLeft: -8 }}
              accessibilityLabel={t("common.back")}
            />
          ),
        }}
      />
      <Stack.Screen name="carga" options={{ title: t("entrega.loadTruck") }} />
      <Stack.Screen
        name="factura/[noPedidoStr]"
        options={{ title: t("entrega.deliveryDetailTitle") }}
      />
    </Stack>
  );
}
