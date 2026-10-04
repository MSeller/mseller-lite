import React from "react";
import { useWindowDimensions } from "react-native";
import { useTheme } from "react-native-paper";

import { gutterFor, type CustomTheme } from "@/constants/Theme";
import { useTranslation } from "@/hooks/useTranslation";
import ProgressSummaryCard from "./ProgressSummaryCard";

interface ProgressHeaderProps {
  totalProductos: number;
  productosPreparados: number;
  noRuta: string;
}

/** Picking progress above the zone list: the route's summary card. */
const ProgressHeader: React.FC<ProgressHeaderProps> = ({
  totalProductos,
  productosPreparados,
  noRuta,
}) => {
  const theme = useTheme() as CustomTheme;
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const gutter = gutterFor(width);
  const { spacing } = theme.custom;

  return (
    <ProgressSummaryCard
      overline={`${t("preparacion.activeRoute")} · ${t("preparacion.liveSession")}`}
      title={noRuta}
      done={productosPreparados}
      total={totalProductos}
      caption={t("preparacion.productsPicked")}
      live
      style={{ marginHorizontal: gutter, marginTop: spacing.md, marginBottom: spacing.sm }}
    />
  );
};

export default ProgressHeader;
