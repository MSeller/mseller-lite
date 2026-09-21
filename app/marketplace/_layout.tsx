import { Stack } from "expo-router";
import React from "react";

import SectionAccessGate from "@/components/navigation/SectionAccessGate";
import { useTranslation } from "@/hooks/useTranslation";

export default function MarketplaceLayout() {
  const { t } = useTranslation();

  // El gate de ruta NO sobra por tener la pestaña oculta: `useNavigationAccess` controla la
  // visibilidad, pero un enlace directo montaba igualmente las pantallas y disparaba sus
  // peticiones B2B. Mismo patrón que `app/entrega/[rutaId]/_layout.tsx`.
  return (
    <SectionAccessGate section="marketplace" message={t("marketplace.accessNotAllowed")}>
      {/* Cada pantalla pinta su propio Appbar, así que la cabecera del navegador va apagada. */}
      <Stack screenOptions={{ headerShown: false }} />
    </SectionAccessGate>
  );
}
