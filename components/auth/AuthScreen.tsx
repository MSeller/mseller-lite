import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";
import { BUSINESS_SIGN_UP_ENABLED } from "../../constants/registration";
import { CustomTheme } from "../../constants/Theme";
import LoginScreen from "./LoginScreen";
import PasswordResetScreen from "./PasswordResetScreen";
import SignUpScreen from "./SignUpScreen";

type AuthMode = "login" | "signup" | "reset";

const AuthScreen: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const theme = useTheme() as CustomTheme;

  const login = (
    <LoginScreen
      onNavigateToSignUp={
        BUSINESS_SIGN_UP_ENABLED ? () => setMode("signup") : undefined
      }
      onNavigateToPasswordReset={() => setMode("reset")}
    />
  );

  const renderScreen = () => {
    switch (mode) {
      case "signup":
        return BUSINESS_SIGN_UP_ENABLED ? (
          <SignUpScreen onNavigateToLogin={() => setMode("login")} />
        ) : (
          login
        );
      case "reset":
        return <PasswordResetScreen onNavigateBack={() => setMode("login")} />;
      default:
        return login;
    }
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {renderScreen()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default AuthScreen;
