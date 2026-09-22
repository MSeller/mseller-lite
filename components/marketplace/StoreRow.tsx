import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Icon, Text, useTheme } from "react-native-paper";

import type { CustomTheme } from "../../constants/Theme";
import { useTranslation } from "../../hooks/useTranslation";
import type { TiendaMarketplace } from "../../types/b2b";
import { vinculoTone } from "../../utils/b2b";
import { formatMoney } from "../../utils/documentFormat";
import AppCard from "../ui/AppCard";
import StatusChip from "../ui/StatusChip";
import StoreLogo from "./StoreLogo";

interface Props {
  tienda: TiendaMarketplace;
  onOpen: () => void;
  onRedeem: () => void;
  onRequest: () => void;
}

/**
 * One supplier in the directory.
 *
 * The catalogue can be BROWSED regardless of link state — a published store's window is
 * open to any buyer in its country, so the row always opens it. What the link still
 * decides is whether there is anything else to do here: an active link needs no further
 * action (the buyer already orders from inside the catalogue), a pending one can only be
 * waited on, and no link at all offers the two ways in — the code the rep handed over, or
 * asking the store for access — for when the buyer decides they want to order.
 */
const StoreRow: React.FC<Props> = ({ tienda, onOpen, onRedeem, onRequest }) => {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const estado = tienda.estadoVinculo ?? null;
  const active = estado === "activa";

  const subtitle = [
    tienda.categoria,
    tienda.minimoPedido
      ? t("marketplace.minimumOrder", { value: formatMoney(tienda.minimoPedido) })
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <AppCard onPress={onOpen}>
      <View style={styles.content}>
        <View style={styles.header}>
          <StoreLogo nombre={tienda.nombre} logoUrl={tienda.logoUrl} />
          <View style={styles.titleBlock}>
            <Text variant="titleSmall" style={styles.name} numberOfLines={2}>
              {tienda.nombre}
            </Text>
            {/* The one line that decides whether a browsing buyer stops to look, before
                they've opened anything. Separate from `descripcion`, which is longer. */}
            {!!tienda.eslogan && (
              <Text variant="bodySmall" style={styles.eslogan} numberOfLines={2}>
                {tienda.eslogan}
              </Text>
            )}
            {!!subtitle && (
              <Text variant="bodySmall" style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
            {!!tienda.descripcion && (
              <Text variant="bodySmall" style={styles.description} numberOfLines={2}>
                {tienda.descripcion}
              </Text>
            )}
          </View>
          <Icon source="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
        </View>

        <View style={styles.actions}>
          {estado && <StatusChip label={t(`marketplace.linkState.${estado}`)} tone={vinculoTone(estado)} />}

          {active ? (
            <Button mode="text" compact onPress={onOpen}>
              {t("marketplace.openCatalog")}
            </Button>
          ) : estado === "pendiente" ? (
            // Nothing for the buyer to do until the supplier's rep approves, but browsing
            // is still open — the button just cannot start an order.
            <Button mode="text" compact onPress={onOpen}>
              {t("marketplace.awaitingApproval")}
            </Button>
          ) : estado === "bloqueada" ? (
            <Button mode="text" compact onPress={onOpen}>
              {t("marketplace.openCatalog")}
            </Button>
          ) : (
            <View style={styles.buttonRow}>
              <Button mode="text" compact onPress={onRedeem}>
                {t("marketplace.redeemCode")}
              </Button>
              {/* A rejected request is not re-sent from here — the code is the way back in. */}
              {estado !== "rechazada" && (
                <Button mode="text" compact onPress={onRequest}>
                  {t("marketplace.requestAccess")}
                </Button>
              )}
            </View>
          )}
        </View>
      </View>
    </AppCard>
  );
};

const createStyles = (theme: CustomTheme) =>
  StyleSheet.create({
    content: {
      paddingVertical: 12,
      paddingHorizontal: 14,
      gap: 10,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    titleBlock: {
      flex: 1,
      gap: 2,
    },
    name: {
      color: theme.colors.onSurface,
      fontWeight: "700",
    },
    eslogan: {
      color: theme.colors.onSurfaceVariant,
      fontStyle: "italic",
    },
    subtitle: {
      color: theme.colors.onSurfaceVariant,
    },
    description: {
      color: theme.colors.onSurfaceVariant,
    },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      flexWrap: "wrap",
    },
    buttonRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginLeft: "auto",
    },
  });

export default StoreRow;
