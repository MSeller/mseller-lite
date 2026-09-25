import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo } from "react";
import { PaperProvider } from "react-native-paper";
import "react-native-reanimated";

// Initialize i18n
import "@/config/i18n";

import AuthScreen from "@/components/auth/AuthScreen";
import CreateBusinessScreen from "@/components/auth/CreateBusinessScreen";
import LoadingScreen from "@/components/auth/LoadingScreen";
import ProfileUnavailableScreen from "@/components/auth/ProfileUnavailableScreen";
import EnvironmentBadge from "@/components/common/EnvironmentBadge";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import OnboardingScreen from "@/components/onboarding/OnboardingScreen";
import { getTheme } from "@/constants/Theme";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { MarketplaceCartProvider } from "@/contexts/MarketplaceCartContext";
import { PrinterProvider } from "@/contexts/PrinterContext";
import { UserProvider, useUser } from "@/contexts/UserContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useTranslation } from "@/hooks/useTranslation";
import { needsOnboarding } from "@/utils/account";

// Keep the launch screen up while Firebase restores the saved session, so a signed-in user
// goes straight into the app instead of flashing the login screen.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootLayoutContent() {
  const colorScheme = useColorScheme();
  const { user, loading } = useAuth();
  const { userProfile, loading: profileLoading, profileMissing } = useUser();
  const { t } = useTranslation();

  /**
   * React Navigation paints the page behind every screen from its OWN theme, and
   * its default is a flat grey that has nothing to do with our palette. Deriving
   * it from the design system is what keeps every screen's page, headers and
   * hairlines on the same tokens as the iOS app, in light and dark mode.
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

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync().catch(() => undefined);
  }, [loading]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <AuthScreen />;
  }

  // Wait for the first profile, which decides between the app and business setup. A later
  // refresh keeps the previous profile, so it never blanks the running app.
  if (!userProfile && profileLoading) {
    return <LoadingScreen />;
  }

  // A Google login with no MSeller account behind it: offer to create a business.
  if (!userProfile && profileMissing) {
    return <CreateBusinessScreen />;
  }

  // Without a profile there is no business to talk to and no way to know whether setup is
  // pending, so the app must not open behind it.
  if (!userProfile) {
    return <ProfileUnavailableScreen />;
  }

  if (needsOnboarding(userProfile)) {
    return <OnboardingScreen />;
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
        <Stack.Screen name="marketplace" options={{ headerShown: false }} />
        <Stack.Screen name="impresoras" options={{ headerShown: false }} />
        <Stack.Screen name="api-test" options={{ title: t("navigation.apiTest") }} />
        <Stack.Screen name="+not-found" />
      </Stack>
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
              <MarketplaceCartProvider>
                <RootLayoutContent />
                <EnvironmentBadge />
                {/* Here rather than in the navigator so the sign-in and setup screens, which
                    render before it, also follow the system appearance. */}
                <StatusBar style="auto" />
              </MarketplaceCartProvider>
            </PrinterProvider>
          </UserProvider>
        </AuthProvider>
      </PaperProvider>
    </ErrorBoundary>
  );
}
