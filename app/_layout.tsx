import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo } from "react";
import { PaperProvider } from "react-native-paper";
import "react-native-reanimated";

// Initialize i18n
import "@/config/i18n";

import AuthScreen from "@/components/auth/AuthScreen";
import LoadingScreen from "@/components/auth/LoadingScreen";
import EnvironmentBadge from "@/components/common/EnvironmentBadge";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import { getTheme } from "@/constants/Theme";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PrinterProvider } from "@/contexts/PrinterContext";
import { UserProvider } from "@/contexts/UserContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useTranslation } from "@/hooks/useTranslation";

function RootLayoutContent() {
  const colorScheme = useColorScheme();
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  /**
   * React Navigation paints the page behind every screen from its OWN theme, and
   * its default is a flat grey that has nothing to do with our palette. Deriving
   * it from the design system is what makes the paper-tone page consistent app
   * wide — and it is what lets white cards read as raised without a shadow,
   * instead of sitting invisibly on a near-white background.
   */
  const navigationTheme = useMemo(() => {
    const isDark = colorScheme === "dark";
    const base = isDark ? DarkTheme : DefaultTheme;
    const { colors } = getTheme(isDark);

    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.background,
        card: colors.surface,
        text: colors.onSurface,
        border: colors.outlineVariant,
        primary: colors.primary,
        notification: colors.error,
      },
    };
  }, [colorScheme]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="preparacion"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="entrega" options={{ headerShown: false }} />
        <Stack.Screen name="documentos" options={{ headerShown: false }} />
        <Stack.Screen name="impresoras" options={{ headerShown: false }} />
        <Stack.Screen name="api-test" options={{ title: t("navigation.apiTest") }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme === "dark");

  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  // Add global error handling for production
  useEffect(() => {
    console.log(
      "🚀 App starting - Environment:",
      __DEV__ ? "Development" : "Production"
    );

    const originalConsoleError = console.error;
    console.error = (...args) => {
      originalConsoleError(...args);
      // In production, you might want to send this to a logging service
      if (__DEV__ === false) {
        console.log("🚨 Production Error Logged:", args);
      }
    };

    // Add React Native global error handler
    const originalHandler = typeof ErrorUtils !== "undefined" ? ErrorUtils?.getGlobalHandler?.() : undefined;

    const customGlobalHandler = (error: any, isFatal?: boolean) => {
      console.error("🚨 Global Error Handler:", { error, isFatal });
      if (!__DEV__) {
        console.log("🚨 PRODUCTION: Global Error Details:", {
          message: error?.message,
          stack: error?.stack,
          isFatal: isFatal ?? false,
          timestamp: new Date().toISOString(),
        });
      }

      // Call original handler if it exists
      if (originalHandler) {
        originalHandler(error, isFatal);
      }
    };

    if (typeof ErrorUtils !== "undefined" && ErrorUtils?.setGlobalHandler) {
      ErrorUtils.setGlobalHandler(customGlobalHandler);
    }

    return () => {
      console.error = originalConsoleError;
      if (typeof ErrorUtils !== "undefined" && ErrorUtils?.setGlobalHandler && originalHandler) {
        ErrorUtils.setGlobalHandler(originalHandler);
      }
    };
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <UserProvider>
            <PrinterProvider>
              <RootLayoutContent />
              <EnvironmentBadge />
            </PrinterProvider>
          </UserProvider>
        </AuthProvider>
      </PaperProvider>
    </ErrorBoundary>
  );
}
