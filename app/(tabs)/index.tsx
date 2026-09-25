import { router } from "expo-router";
import React, { useMemo } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Avatar, Button, Chip, Icon, Text, TouchableRipple, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { getDocumentTypeMeta } from "@/components/documents/documentMeta";
import WorkCard from "@/components/home/WorkCard";
import AppCard from "@/components/ui/AppCard";
import SectionHeader from "@/components/ui/SectionHeader";
import type { CustomTheme } from "@/constants/Theme";
import { useUser } from "@/contexts/UserContext";
import { useHomeSummary } from "@/hooks/useHomeSummary";
import { useNavigationAccess } from "@/hooks/useNavigationAccess";
import { useTranslation } from "@/hooks/useTranslation";
import { formatDateShort, formatMoney } from "@/utils/documentFormat";

/**
 * Home is the user's day: what is waiting in each module they work in, the one or
 * two things they start most often, and the documents they touched last. Every
 * block follows the user type (hooks/useNavigationAccess), so a driver's home is
 * about deliveries and a seller's about documents.
 */
export default function HomeScreen() {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const { user, userProfile, loading } = useUser();
  const { can } = useNavigationAccess();
  const summary = useHomeSummary();

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return t("dashboard.goodMorning");
    if (hour < 18) return t("dashboard.goodAfternoon");
    return t("dashboard.goodEvening");
  })();

  const userName = userProfile?.firstName || user?.displayName || t("home.defaultName");
  const initials = userName
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.center]}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  const openSection = (tab: "routes" | "stock", section: string) =>
    router.navigate({ pathname: `/(tabs)/${tab}`, params: { section } });

  const cards = [
    can("picking") && (
      <WorkCard
        key="picking"
        title={t("navigation.sections.picking")}
        icon="package-variant"
        {...summary.picking}
        lines={
          summary.picking.data && [
            { value: summary.picking.data.toPrepare, label: t("home.toPrepare"), attention: true },
            { value: summary.picking.data.readyToDispatch, label: t("home.readyToDispatch") },
          ]
        }
        onPress={() => openSection("routes", "picking")}
        onRetry={() => summary.retry("picking")}
      />
    ),
    can("deliveries") && (
      <WorkCard
        key="deliveries"
        title={t("navigation.sections.deliveries")}
        icon="truck-outline"
        {...summary.deliveries}
        lines={
          summary.deliveries.data && [
            { value: summary.deliveries.data.pendingStops, label: t("home.pendingStops"), attention: true },
            { value: summary.deliveries.data.activeRoutes, label: t("home.activeRoutes") },
          ]
        }
        onPress={() => openSection("routes", "deliveries")}
        onRetry={() => summary.retry("deliveries")}
      />
    ),
    can("stockCount") && (
      <WorkCard
        key="stockCount"
        title={t("navigation.sections.stockCount")}
        icon="clipboard-check-outline"
        {...summary.stockCount}
        lines={
          summary.stockCount.data && [
            { value: summary.stockCount.data.activeCounts, label: t("home.activeCounts") },
            { value: summary.stockCount.data.unsynced, label: t("home.unsynced"), attention: true },
          ]
        }
        onPress={() => openSection("stock", "stockCount")}
        onRetry={() => summary.retry("stockCount")}
      />
    ),
    can("documents") && (
      <WorkCard
        key="documents"
        title={t("navigation.documents")}
        icon="file-document-outline"
        {...summary.documents}
        lines={summary.documents.data && [{ value: summary.documents.data.today, label: t("home.documentsToday") }]}
        onPress={() => router.navigate("/(tabs)/documents")}
        onRetry={() => summary.retry("documents")}
      />
    ),
  ].filter(Boolean);

  const recent = summary.documents.data?.recent ?? [];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={summary.refreshing} onRefresh={summary.refresh} />}
      >
        {/* The greeting is the page's own title, so it sits on the page, not in a card. */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text variant="bodyMedium" style={styles.muted}>
              {greeting}
            </Text>
            <Text variant="headlineMedium" style={styles.userName} numberOfLines={1}>
              {userName}
            </Text>
            {!!userProfile && (
              <Text variant="bodySmall" style={styles.muted} numberOfLines={1}>
                {[userProfile.business?.name, t(`home.userTypes.${userProfile.type}`)].filter(Boolean).join(" · ")}
              </Text>
            )}
          </View>
          <TouchableRipple
            onPress={() => router.navigate("/(tabs)/more")}
            borderless
            style={styles.avatarTouch}
            accessibilityLabel={t("navigation.more")}
          >
            {user?.photoURL ? (
              <Avatar.Image size={48} source={{ uri: user.photoURL }} />
            ) : (
              <Avatar.Text size={48} label={initials} style={styles.avatar} labelStyle={styles.avatarLabel} />
            )}
          </TouchableRipple>
        </View>

        {userProfile?.testMode && (
          <Chip
            compact
            icon="test-tube"
            style={styles.testChip}
            textStyle={{ color: theme.custom.status.warning.onContainer }}
          >
            {t("home.testMode")}
          </Chip>
        )}

        {(can("documents") || can("products")) && (
          <View style={styles.actions}>
            {can("documents") && (
              <Button
                mode="contained"
                icon="plus"
                style={styles.action}
                contentStyle={styles.actionContent}
                onPress={() => router.push("/documentos/nuevo")}
              >
                {t("documents.newDocument")}
              </Button>
            )}
            {can("products") && (
              <Button
                mode="outlined"
                icon="magnify"
                style={styles.action}
                contentStyle={styles.actionContent}
                onPress={() => openSection("stock", "products")}
              >
                {t("home.findProduct")}
              </Button>
            )}
          </View>
        )}

        {cards.length > 0 && (
          <>
            <SectionHeader title={t("home.today")} />
            <View style={styles.grid}>{cards}</View>
          </>
        )}

        {can("documents") && recent.length > 0 && (
          <>
            <SectionHeader title={t("home.recentDocuments")} />
            <AppCard style={styles.recentCard}>
              {recent.map((doc, index) => {
                const meta = getDocumentTypeMeta(doc.tipoDocumento);
                const accent = theme.colors[meta.accent];
                return (
                  <TouchableRipple
                    key={doc.noPedidoStr}
                    onPress={() => router.push(`/documentos/${encodeURIComponent(doc.noPedidoStr)}`)}
                    style={[styles.recentRow, index > 0 && styles.recentDivider]}
                  >
                    <View style={styles.recentInner}>
                      <View style={[styles.recentIcon, { backgroundColor: `${accent}14` }]}>
                        <Icon source={meta.icon} size={18} color={accent} />
                      </View>
                      <View style={styles.recentBody}>
                        <Text variant="titleSmall" style={styles.userName} numberOfLines={1}>
                          {doc.noPedidoStr}
                        </Text>
                        <Text variant="bodySmall" style={styles.muted} numberOfLines={1}>
                          {doc.nombreCliente || doc.codigoCliente || t("documents.noCustomer")} ·{" "}
                          {formatDateShort(doc.fecha)}
                        </Text>
                      </View>
                      <Text variant="titleSmall" style={styles.userName}>
                        {formatMoney(doc.total)}
                      </Text>
                    </View>
                  </TouchableRipple>
                );
              })}
            </AppCard>
          </>
        )}

        {!!userProfile && cards.length === 0 && (
          <Text variant="bodyMedium" style={[styles.muted, styles.empty]}>
            {t("navigation.noSections")}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: CustomTheme) => {
  const { spacing, radius, hairline } = theme.custom;

  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    center: {
      alignItems: "center",
      justifyContent: "center",
    },
    container: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xxl,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.lg,
      paddingVertical: spacing.lg,
    },
    headerText: {
      flex: 1,
      gap: 2,
    },
    muted: {
      color: theme.colors.onSurfaceVariant,
    },
    userName: {
      color: theme.colors.onSurface,
    },
    avatarTouch: {
      borderRadius: radius.pill,
    },
    avatar: {
      backgroundColor: theme.colors.primaryContainer,
    },
    avatarLabel: {
      color: theme.colors.onPrimaryContainer,
      fontWeight: "700",
    },
    testChip: {
      alignSelf: "flex-start",
      marginBottom: spacing.lg,
      backgroundColor: theme.custom.status.warning.container,
    },
    actions: {
      flexDirection: "row",
      gap: spacing.sm,
      marginBottom: spacing.xl,
    },
    action: {
      flex: 1,
      borderRadius: radius.container,
    },
    actionContent: {
      paddingVertical: 6,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      marginBottom: spacing.xl,
    },
    recentCard: {
      marginBottom: spacing.xl,
    },
    recentRow: {
      paddingHorizontal: spacing.lg,
      paddingVertical: 12,
    },
    recentDivider: {
      borderTopWidth: hairline,
      borderTopColor: theme.colors.outlineVariant,
    },
    recentInner: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 4,
    },
    recentIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    recentBody: {
      flex: 1,
      gap: 2,
    },
    empty: {
      textAlign: "center",
      marginTop: spacing.xxl,
    },
  });
};
