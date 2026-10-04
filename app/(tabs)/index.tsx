import { router } from "expo-router";
import React, { useMemo } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Chip, Icon, Text, TouchableRipple, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import { getDocumentTypeMeta } from "@/components/documents/documentMeta";
import WorkCard from "@/components/home/WorkCard";
import AppCard from "@/components/ui/AppCard";
import EmptyState from "@/components/ui/EmptyState";
import SectionHeader from "@/components/ui/SectionHeader";
import UserAvatar from "@/components/ui/UserAvatar";
import type { CustomTheme } from "@/constants/Theme";
import { useUser } from "@/contexts/UserContext";
import { useDocumentAccess } from "@/hooks/useDocumentAccess";
import { useHomeSummary } from "@/hooks/useHomeSummary";
import { useNavigationAccess } from "@/hooks/useNavigationAccess";
import { useTranslation } from "@/hooks/useTranslation";
import { formatDateShort, formatMoney } from "@/utils/documentFormat";
import AppButton from "../../components/ui/AppButton";

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
  // Capturing is a finer permission than seeing Documentos (per-user document types).
  const { canCreateDocuments } = useDocumentAccess();
  const summary = useHomeSummary();

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return t("dashboard.goodMorning");
    if (hour < 18) return t("dashboard.goodAfternoon");
    return t("dashboard.goodEvening");
  })();

  const userName = userProfile?.firstName || user?.displayName || t("home.defaultName");

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
    can("truckLoading") && !can("picking") && (
      <WorkCard
        key="truckLoading"
        title={t("navigation.loading")}
        icon="truck-cargo-container"
        {...summary.picking}
        lines={summary.picking.data && [{ value: summary.picking.data.readyToDispatch, label: t("home.readyToLoad"), attention: true }]}
        onPress={() => router.navigate("/(tabs)/loading")}
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

  // Deliveries are a driver's whole day, so when there are none, or the module is not theirs
  // yet, Home says why in words instead of leaving a "0" or a lock on a small card. Other
  // roles have more modules than this one, so for them the card's own lock is enough.
  const isDriver = userProfile?.type === "driver";
  const deliveries = summary.deliveries;
  const deliveryNotice = !isDriver || !can("deliveries")
    ? null
    : deliveries.unavailable === "disabled"
      ? {
          icon: "lock-outline",
          title: t("entrega.list.disabledTitle"),
          message: t("entrega.list.disabledBody"),
          action: { label: t("common.refresh"), onPress: () => summary.retry("deliveries") },
        }
      : deliveries.unavailable === "unassigned"
        ? {
            icon: "account-alert-outline",
            title: t("entrega.list.unassignedTitle"),
            message: t("entrega.list.unassignedBody"),
            action: { label: t("common.refresh"), onPress: () => summary.retry("deliveries") },
          }
        : deliveries.data && deliveries.data.activeRoutes === 0 && deliveries.data.pendingStops === 0
          ? {
              icon: "truck-check-outline",
              title: t("home.noDeliveriesTitle"),
              message: t("home.noDeliveriesBody"),
              action: { label: t("home.viewRoutes"), icon: "chevron-right", onPress: () => openSection("routes", "deliveries") },
            }
          : null;

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
            <UserAvatar
              size={48}
              photoURL={userProfile?.photoURL || user?.photoURL}
              name={[userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(" ") || userName}
            />
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

        {(canCreateDocuments || can("products")) && (
          <View style={styles.actions}>
            {canCreateDocuments && (
              <AppButton
                mode="contained"
                icon="plus"
                style={styles.action}
                contentStyle={styles.actionContent}
                onPress={() => router.push("/documentos/nuevo")}
              >
                {t("documents.newDocument")}
              </AppButton>
            )}
            {can("products") && (
              <AppButton
                mode="outlined"
                icon="magnify"
                style={styles.action}
                contentStyle={styles.actionContent}
                onPress={() => openSection("stock", "products")}
              >
                {t("home.findProduct")}
              </AppButton>
            )}
          </View>
        )}

        {!!deliveryNotice && (
          <AppCard style={styles.notice}>
            <EmptyState
              icon={deliveryNotice.icon}
              title={deliveryNotice.title}
              message={deliveryNotice.message}
              action={deliveryNotice.action}
              style={styles.noticeBody}
            />
          </AppCard>
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
    notice: {
      marginBottom: spacing.lg,
    },
    noticeBody: {
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
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
