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
 * The row is shaped by the link this buyer has with the store, because that is the only
 * thing that decides what they can do next: an active link opens the catalogue, a
 * pending one can only be waited on, and no link at all offers the two ways in — the
 * code the rep handed over, or asking the store for access.
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
    <AppCard onPress={active ? onOpen : undefined}>
      <View style={styles.content}>
        <View style={styles.header}>
          <StoreLogo nombre={tienda.nombre} logoUrl={tienda.logoUrl} />
          <View style={styles.titleBlock}>
            <Text variant="titleSmall" style={styles.name} numberOfLines={2}>
              {tienda.nombre}
            </Text>
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
          {active && <Icon source="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />}
        </View>

        <View style={styles.actions}>
          {estado && <StatusChip label={t(`marketplace.linkState.${estado}`)} tone={vinculoTone(estado)} />}

          {active ? (
            <Button mode="text" compact onPress={onOpen}>
              {t("marketplace.openCatalog")}
            </Button>
          ) : estado === "pendiente" ? (
            // Nothing for the buyer to do until the supplier's rep approves: the button
            // stays visible so the row does not look broken, but it cannot be pressed.
            <Button mode="text" compact disabled onPress={() => undefined}>
              {t("marketplace.awaitingApproval")}
            </Button>
          ) : estado === "bloqueada" ? null : (
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
