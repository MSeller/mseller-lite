import { router } from "expo-router";
import React, { useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Avatar,
  Chip,
  Divider,
  Icon,
  Text,
  useTheme,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import AppCard from "@/components/ui/AppCard";
import SectionHeader from "@/components/ui/SectionHeader";
import type { CustomTheme } from "@/constants/Theme";
import { useUser } from "@/contexts/UserContext";
import { useTranslation } from "@/hooks/useTranslation";

export default function HomeScreen() {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const { user, userProfile, loading } = useUser();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t("dashboard.goodMorning");
    if (hour < 18) return t("dashboard.goodAfternoon");
    return t("dashboard.goodEvening");
  };

  const getUserName = () => {
    if (userProfile?.firstName) return userProfile.firstName;
    if (user?.displayName) return user.displayName;
    return "Usuario";
  };

  const getInitials = (name: string): string =>
    name
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase())
      .join("")
      .slice(0, 2);

  const quickActions = [
    {
      id: "search",
      title: t("dashboard.searchProducts"),
      icon: "magnify",
      color: theme.colors.primary,
      onPress: () => router.push("/(tabs)/products"),
    },
    {
      id: "inventory",
      title: t("dashboard.viewInventory"),
      icon: "package-variant",
      color: theme.colors.secondary,
      onPress: () => router.push("/(tabs)/inventory"),
    },
    {
      id: "profile",
      title: t("navigation.profile"),
      icon: "account",
      color: theme.colors.tertiary,
      onPress: () => router.push("/(tabs)/profile"),
    },
  ];

  const features = [
    {
      id: "products",
      title: t("dashboard.productManagement"),
      description: t("dashboard.productManagementDesc"),
      icon: "barcode-scan",
      color: theme.colors.primary,
    },
    {
      id: "inventory",
      title: t("dashboard.inventoryTracking"),
      description: t("dashboard.inventoryTrackingDesc"),
      icon: "clipboard-list",
      color: theme.colors.secondary,
    },
    {
      id: "labels",
      title: t("dashboard.labelPrinting"),
      description: t("dashboard.labelPrintingDesc"),
      icon: "qrcode",
      color: theme.colors.tertiary,
    },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  /** Label + value on one line — the shape most of this screen is made of. */
  const InfoRow = ({
    label,
    value,
    trailing,
  }: {
    label: string;
    value?: string;
    trailing?: React.ReactNode;
  }) => (
    <View style={styles.infoRow}>
      <Text variant="bodyMedium" style={styles.infoLabel}>
        {label}
      </Text>
      {trailing ?? (
        <Text variant="bodyMedium" style={styles.infoValue} numberOfLines={1}>
          {value}
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* The greeting sits directly on the page rather than in a card: it is
            the page's own title, and boxing it makes it compete with content. */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text variant="bodyMedium" style={styles.greeting}>
              {getGreeting()}
            </Text>
            <Text variant="headlineMedium" style={styles.userName} numberOfLines={1}>
              {getUserName()}
            </Text>
          </View>
          {user?.photoURL ? (
            <Avatar.Image size={52} source={{ uri: user.photoURL }} />
          ) : (
            <Avatar.Text
              size={52}
              label={getInitials(getUserName())}
              style={styles.avatar}
              labelStyle={styles.avatarLabel}
            />
          )}
        </View>

        <SectionHeader title={t("dashboard.quickActions")} />
        <View style={styles.actionsRow}>
          {quickActions.map((action) => (
            <AppCard
              key={action.id}
              style={styles.actionCard}
              onPress={action.onPress}
              contentStyle={styles.actionCardContent}
            >
              <View style={styles.actionInner}>
                <View
                  style={[styles.actionIcon, { backgroundColor: `${action.color}14` }]}
                >
                  <Icon source={action.icon} size={24} color={action.color} />
                </View>
                <Text variant="labelLarge" style={styles.actionTitle} numberOfLines={2}>
                  {action.title}
                </Text>
              </View>
            </AppCard>
          ))}
        </View>

        {userProfile && (
          <>
            <SectionHeader title={t("dashboard.businessInfo")} />
            <AppCard style={styles.card}>
              <View style={styles.cardBody}>
                <InfoRow label={t("dashboard.company")} value={userProfile.business?.name} />
                <Divider style={styles.rowDivider} />
                <InfoRow label={t("dashboard.role")} value={userProfile.type} />
                <Divider style={styles.rowDivider} />
                <InfoRow
                  label={t("dashboard.mode")}
                  trailing={
                    <Chip
                      compact
                      icon={userProfile.testMode ? "test-tube" : "check-circle"}
                      style={[
                        styles.modeChip,
                        {
                          backgroundColor: userProfile.testMode
                            ? theme.custom.status.warning.container
                            : theme.custom.status.positive.container,
                        },
                      ]}
                      textStyle={[
                        styles.modeChipText,
                        {
                          color: userProfile.testMode
                            ? theme.custom.status.warning.onContainer
                            : theme.custom.status.positive.onContainer,
                        },
                      ]}
                    >
                      {userProfile.testMode ? t("dashboard.modeTest") : t("dashboard.modeProduction")}
                    </Chip>
                  }
                />
              </View>
            </AppCard>
          </>
        )}

        <SectionHeader title={t("dashboard.getStarted")} />
        <AppCard style={styles.card}>
          <View style={styles.cardBody}>
            <Text variant="bodyMedium" style={styles.featuresIntro}>
              {t("dashboard.exploreFeatures")}
            </Text>
            {features.map((feature, index) => (
              <View key={feature.id}>
                {index === 0 && <Divider style={styles.rowDivider} />}
                <View style={styles.featureRow}>
                  <View
                    style={[
                      styles.featureIcon,
                      { backgroundColor: `${feature.color}14` },
                    ]}
                  >
                    <Icon source={feature.icon} size={20} color={feature.color} />
                  </View>
                  <View style={styles.featureContent}>
                    <Text variant="titleSmall" style={styles.featureTitle}>
                      {feature.title}
                    </Text>
                    <Text variant="bodySmall" style={styles.featureDescription}>
                      {feature.description}
                    </Text>
                  </View>
                </View>
                {index < features.length - 1 && <Divider style={styles.rowDivider} />}
              </View>
            ))}
          </View>
        </AppCard>

        <SectionHeader title={t("dashboard.systemStatus")} />
        <View style={styles.statusRow}>
          {[
            { id: "net", label: t("dashboard.connection"), value: t("dashboard.connectionActive"), icon: "wifi" },
            { id: "db", label: t("dashboard.database"), value: t("dashboard.databaseOnline"), icon: "database" },
          ].map((status) => (
            <AppCard key={status.id} style={styles.statusCard}>
              <View style={styles.statusInner}>
                <Icon
                  source={status.icon}
                  size={20}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text variant="bodySmall" style={styles.statusLabel}>
                  {status.label}
                </Text>
                <View style={styles.statusValueRow}>
                  <View style={styles.statusDot} />
                  <Text variant="labelLarge" style={styles.statusValue}>
                    {status.value}
                  </Text>
                </View>
              </View>
            </AppCard>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: CustomTheme) => {
  const { spacing, radius } = theme.custom;

  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    container: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xl,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
      paddingVertical: spacing.md,
    },
    headerText: {
      flex: 1,
      gap: 2,
    },
    greeting: {
      color: theme.colors.onSurfaceVariant,
    },
    userName: {
      color: theme.colors.onBackground,
    },
    avatar: {
      backgroundColor: theme.colors.primaryContainer,
    },
    avatarLabel: {
      color: theme.colors.onPrimaryContainer,
      fontWeight: "700",
    },
    card: {
      marginBottom: spacing.lg,
    },
    cardBody: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
      paddingVertical: 14,
      minHeight: 48,
    },
    infoLabel: {
      color: theme.colors.onSurfaceVariant,
    },
    infoValue: {
      color: theme.colors.onSurface,
      fontWeight: "600",
      flexShrink: 1,
      textAlign: "right",
    },
    rowDivider: {
      backgroundColor: theme.colors.outlineVariant,
    },
    modeChip: {
      borderRadius: radius.sm,
    },
    modeChipText: {
      fontSize: 12,
      fontWeight: "600",
    },
    actionsRow: {
      flexDirection: "row",
      gap: spacing.sm + 2,
      marginBottom: spacing.lg,
    },
    actionCard: {
      flex: 1,
    },
    actionCardContent: {
      minHeight: 104,
    },
    actionInner: {
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xs,
      minHeight: 104,
    },
    actionIcon: {
      width: 44,
      height: 44,
      borderRadius: radius.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    actionTitle: {
      color: theme.colors.onSurface,
      textAlign: "center",
    },
    featuresIntro: {
      color: theme.colors.onSurfaceVariant,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
      lineHeight: 20,
    },
    featureRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm + 4,
      paddingVertical: 14,
    },
    featureIcon: {
      width: 36,
      height: 36,
      borderRadius: radius.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    featureContent: {
      flex: 1,
      gap: 2,
    },
    featureTitle: {
      color: theme.colors.onSurface,
    },
    featureDescription: {
      color: theme.colors.onSurfaceVariant,
      lineHeight: 18,
    },
    statusRow: {
      flexDirection: "row",
      gap: spacing.sm + 2,
    },
    statusCard: {
      flex: 1,
    },
    statusInner: {
      alignItems: "center",
      gap: spacing.xs + 2,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
    },
    statusLabel: {
      color: theme.colors.onSurfaceVariant,
      textAlign: "center",
    },
    statusValueRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: theme.custom.status.positive.base,
    },
    statusValue: {
      color: theme.colors.onSurface,
    },
  });
};
