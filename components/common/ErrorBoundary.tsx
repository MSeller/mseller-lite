/**
 * Error Boundary Component for Production Apps
 * Prevents the entire app from crashing due to component errors
 */

import * as SplashScreen from "expo-splash-screen";
import React from "react";
import { Appearance, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { getTheme, type CustomTheme } from "../../constants/Theme";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // A crash during startup would otherwise leave the launch screen covering the fallback.
    SplashScreen.hideAsync().catch(() => undefined);
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Enhanced logging for production debugging
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      isDev: __DEV__,
    };

    console.log(
      "📊 Error Details for Debugging:",
      JSON.stringify(errorDetails, null, 2)
    );

    // In production, you might want to send this to a logging service like Datadog
    if (!__DEV__) {
      console.log("🚨 PRODUCTION ERROR - Check logs:", errorDetails);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error}
            resetError={this.resetError}
          />
        );
      }

      // Default fallback UI. This boundary sits outside PaperProvider (it guards it), so it
      // reads the theme for the current system appearance directly.
      const styles = createStyles(getTheme(Appearance.getColorScheme() === "dark"));
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Oops! Something went wrong</Text>
          <Text style={styles.message}>
            We&apos;re sorry, but something unexpected happened. Please try
            again.
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.resetError}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const createStyles = (theme: CustomTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.custom.spacing.xl,
      backgroundColor: theme.custom.colors.background,
    },
    title: {
      ...theme.fonts.headlineSmall,
      color: theme.custom.colors.ink,
      marginBottom: theme.custom.spacing.lg,
      textAlign: "center",
    },
    message: {
      ...theme.custom.type.body,
      color: theme.custom.colors.inkSecondary,
      textAlign: "center",
      marginBottom: theme.custom.spacing.xxl,
    },
    button: {
      backgroundColor: theme.custom.colors.tint,
      paddingHorizontal: theme.custom.spacing.xxl,
      paddingVertical: theme.custom.spacing.md,
      borderRadius: theme.custom.radius.control,
    },
    buttonText: {
      ...theme.custom.type.rowTitle,
      color: theme.colors.onPrimary,
    },
  });

export default ErrorBoundary;
