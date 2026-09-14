import React, { useState } from "react";
import { StyleSheet } from "react-native";
import { Button } from "react-native-paper";

import { useTranslation } from "../../hooks/useTranslation";
import {
  GoogleSignInUnavailableError,
  isGoogleSignInAvailable,
  signInWithGoogle,
} from "../../services/googleSignIn";

interface Props {
  disabled?: boolean;
  onError: (message: string) => void;
}

/**
 * "Continue with Google" for both sign in and sign up: the same Google login either opens the
 * user's account or, when there is none, leads to creating a business (see the root layout).
 * Renders nothing where Google sign-in is not offered.
 */
const GoogleSignInButton: React.FC<Props> = ({ disabled, onError }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  if (!isGoogleSignInAvailable()) return null;

  const handlePress = async () => {
    setLoading(true);
    try {
      // On success the auth listener swaps the auth screens out.
      await signInWithGoogle();
    } catch (error: any) {
      console.error("Google sign in error:", error);
      onError(
        error instanceof GoogleSignInUnavailableError
          ? t("auth.googleUnavailable")
          : error?.code === "auth/account-exists-with-different-credential"
            ? t("auth.googleAccountExistsWithPassword")
            : t("auth.googleFailed"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      mode="outlined"
      icon="google"
      onPress={handlePress}
      loading={loading}
      disabled={disabled || loading}
      style={styles.button}
      contentStyle={styles.content}
    >
      {t("auth.continueWithGoogle")}
    </Button>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
  },
  content: {
    paddingVertical: 12,
  },
});

export default GoogleSignInButton;
