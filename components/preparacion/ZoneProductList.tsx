import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControlProps,
  SectionList,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Icon, Text, useTheme } from "react-native-paper";
import { gutterFor, type CustomTheme } from "@/constants/Theme";
import { useTranslation } from "@/hooks/useTranslation";
import {
  ConsolidadoProducto,
  ConsolidadoZona,
} from "../../types/preparacion";
import EmptyState from "../ui/EmptyState";
import ProductCard from "./ProductCard";

interface ZoneProductListProps {
  zonas: ConsolidadoZona[];
  pickedQtys: Record<string, number>;
  confirmedProducts: Set<string>;
  confirmingZone: string | null;
  onQtyChange?: (codigoProducto: string, qty: number) => void;
  onProductPress: (producto: ConsolidadoProducto) => void;
  onConfirmZone?: (zonaNombre: string) => void;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  ListHeaderComponent?: React.ReactElement;
  /** Replaces the default "no products" state (the screen's load error, with its retry). */
  ListEmptyComponent?: React.ReactElement;
}

interface SectionData {
  title: string;
  allProducts: ConsolidadoProducto[];
  data: ConsolidadoProducto[];
}

const ZoneProductList: React.FC<ZoneProductListProps> = ({
  zonas,
  pickedQtys,
  confirmedProducts,
  confirmingZone,
  onQtyChange,
  onProductPress,
  onConfirmZone,
  refreshControl,
  ListHeaderComponent,
  ListEmptyComponent,
}) => {
  const theme = useTheme() as CustomTheme;
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme, gutterFor(width)), [theme, width]);
  const { colors, status } = theme.custom;
  const { t } = useTranslation();
  const [collapsedZones, setCollapsedZones] = useState<Set<string>>(new Set());

  const sections: SectionData[] = zonas.map((zona) => ({
    title: zona.zonaNombre,
    allProducts: zona.productos,
    data: collapsedZones.has(zona.zonaNombre) ? [] : zona.productos,
  }));

  const toggleZone = (zona: string) => {
    setCollapsedZones((prev) => {
      const next = new Set(prev);
      if (next.has(zona)) next.delete(zona);
      else next.add(zona);
      return next;
    });
  };

  const renderSectionHeader = ({ section }: { section: SectionData }) => {
    const isCollapsed = collapsedZones.has(section.title);
    const total = section.allProducts.length;
    const confirmedCount = section.allProducts.filter((p) =>
      confirmedProducts.has(p.codigoProducto)
    ).length;
    const isComplete = confirmedCount === total && total > 0;
    const label = `${section.title} · ${t("preparacion.ui.productCount", { count: total })}`;

    return (
      <Pressable
        onPress={() => toggleZone(section.title)}
        style={styles.sectionHeader}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${confirmedCount} / ${total} ${t("preparacion.prepared")}`}
        accessibilityState={{ expanded: !isCollapsed }}
      >
        <Text style={styles.sectionTitle} numberOfLines={1}>
          {label}
        </Text>
        <View style={styles.sectionRight}>
          {isComplete && (
            <Icon source="check-circle" size={16} color={status.positive.base} />
          )}
          <Text style={[styles.sectionCount, isComplete && styles.sectionCountDone]}>
            {`${confirmedCount}/${total}`}
          </Text>
          <Icon
            source={isCollapsed ? "chevron-right" : "chevron-down"}
            size={20}
            color={colors.tint}
          />
        </View>
      </Pressable>
    );
  };

  const renderSectionFooter = ({ section }: { section: SectionData }) => {
    if (!onConfirmZone) return null;

    const isCollapsed = collapsedZones.has(section.title);
    if (isCollapsed) return null;

    const allConfirmed = section.allProducts.every((p) =>
      confirmedProducts.has(p.codigoProducto)
    );
    if (allConfirmed) return null;

    const isConfirming = confirmingZone === section.title;

    // A per-zone shortcut, so a quick action rather than a second gradient CTA on the screen.
    return (
      <Pressable
        onPress={() => onConfirmZone(section.title)}
        disabled={isConfirming}
        style={styles.zoneAction}
        accessibilityRole="button"
        accessibilityState={{ disabled: isConfirming, busy: isConfirming }}
      >
        {isConfirming ? (
          <ActivityIndicator size="small" color={colors.tint} />
        ) : (
          <Icon source="check-all" size={20} color={colors.tint} />
        )}
        <Text style={styles.zoneActionLabel}>
          {isConfirming
            ? t("preparacion.confirmingZone")
            : t("preparacion.confirmZone")}
        </Text>
      </Pressable>
    );
  };

  const renderItem = ({ item }: { item: ConsolidadoProducto }) => (
    <ProductCard
      producto={item}
      pickedQty={pickedQtys[item.codigoProducto] ?? 0}
      isConfirmed={confirmedProducts.has(item.codigoProducto)}
      onConfirm={() => onProductPress(item)}
    />
  );

  const hasProducts = zonas.some((z) => z.productos.length > 0);

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.codigoProducto}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      renderSectionFooter={renderSectionFooter}
      stickySectionHeadersEnabled
      refreshControl={refreshControl}
      ListHeaderComponent={ListHeaderComponent}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={
        hasProducts
          ? null
          : ListEmptyComponent ?? (
              <EmptyState
                icon="package-variant-closed"
                title={t("preparacion.noProducts")}
                message={t("preparacion.ui.noProductsBody")}
              />
            )
      }
    />
  );
};

const createStyles = (theme: CustomTheme, gutter: number) => {
  const { colors, spacing, type, hairline, touchTarget, status } = theme.custom;
  return StyleSheet.create({
    listContent: {
      paddingBottom: spacing.xxl,
    },
    // Sticky over the rows, so it carries the page colour and closes with a hairline.
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: gutter,
      paddingTop: spacing.xl,
      paddingBottom: spacing.sm,
      minHeight: touchTarget,
      backgroundColor: colors.background,
      borderBottomWidth: hairline,
      borderBottomColor: colors.hairline,
    },
    sectionTitle: {
      ...type.overline,
      flex: 1,
    },
    sectionRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    sectionCount: {
      ...type.figure(13),
      color: colors.inkSecondary,
    },
    sectionCountDone: {
      color: status.positive.base,
    },
    zoneAction: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      minHeight: touchTarget,
      paddingHorizontal: gutter,
    },
    zoneActionLabel: {
      ...type.body,
      color: colors.tint,
    },
  });
};

export default ZoneProductList;
