import { signOut } from "firebase/auth";
import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Avatar,
  Button,
  Card,
  Divider,
  Paragraph,
  Snackbar,
  Title,
  useTheme,
} from "react-native-paper";
import { auth } from "../../config/firebase";
import { CustomTheme } from "../../constants/Theme";
import { useUser } from "../../contexts/UserContext";
import { useTranslation } from "../../hooks/useTranslation";

interface ProfileScreenProps {
  /** Extra settings rows, shown above Sign Out (the Más tab adds language and developer tools). */
  children?: React.ReactNode;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ children }) => {
  const { user, userProfile } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const theme = useTheme() as CustomTheme;
  const { t } = useTranslation();

  const handleSignOut = async () => {
    setLoading(true);
    setError("");

    try {
      await signOut(auth);
      setSuccess(t("auth.signOut"));
    } catch (error: any) {
      console.error("Sign out error:", error);
      setError(t("errors.genericError"));
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase())
      .join("")
      .slice(0, 2);
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (!user) {
    return null;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.content}>
        <Card elevation={0} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.avatarContainer}>
              {user.photoURL ? (
                <Avatar.Image size={80} source={{ uri: user.photoURL }} />
              ) : (
                <Avatar.Text
                  size={80}
                  label={getInitials(user.displayName || "User")}
                  style={{ backgroundColor: theme.colors.primary }}
                />
              )}
            </View>

            <Title style={[styles.name, { color: theme.colors.onSurface }]}>
              {user.displayName || "User"}
            </Title>

            <Paragraph
              style={[styles.email, { color: theme.colors.onSurfaceVariant }]}
            >
              {user.email}
            </Paragraph>

            <Divider style={styles.divider} />

            {userProfile && (
              <>
                <View style={styles.infoSection}>
                  <Title
                    style={[
                      styles.sectionTitle,
                      { color: theme.colors.primary },
                    ]}
                  >
                    Business Information
                  </Title>

                  <View style={styles.infoRow}>
                    <Paragraph
                      style={[
                        styles.infoLabel,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      Company:
                    </Paragraph>
                    <Paragraph
                      style={[
                        styles.infoValue,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      {userProfile.business.name}
                    </Paragraph>
                  </View>

                  <View style={styles.infoRow}>
                    <Paragraph
                      style={[
                        styles.infoLabel,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      Role:
                    </Paragraph>
                    <Paragraph
                      style={[
                        styles.infoValue,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      {userProfile.type}
                    </Paragraph>
                  </View>

                  <View style={styles.infoRow}>
                    <Paragraph
                      style={[
                        styles.infoLabel,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      Seller Code:
                    </Paragraph>
                    <Paragraph
                      style={[
                        styles.infoValue,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      {userProfile.sellerCode}
                    </Paragraph>
                  </View>

                  <View style={styles.infoRow}>
                    <Paragraph
                      style={[
                        styles.infoLabel,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      Mode:
                    </Paragraph>
                    <Paragraph
                      style={[
                        styles.infoValue,
                        {
                          color: userProfile.testMode
                            ? theme.colors.secondary
                            : theme.colors.primary,
                        },
                      ]}
                    >
                      {userProfile.testMode ? "Test Mode" : "Production"}
                    </Paragraph>
                  </View>
                </View>

                <Divider style={styles.divider} />
              </>
            )}

            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Paragraph
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Account created:
                </Paragraph>
                <Paragraph
                  style={[styles.infoValue, { color: theme.colors.onSurface }]}
                >
                  {user.metadata.creationTime
                    ? formatDate(user.metadata.creationTime)
                    : "Unknown"}
                </Paragraph>
              </View>

              <View style={styles.infoRow}>
                <Paragraph
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Last sign in:
                </Paragraph>
                <Paragraph
                  style={[styles.infoValue, { color: theme.colors.onSurface }]}
                >
                  {user.metadata.lastSignInTime
                    ? formatDate(user.metadata.lastSignInTime)
                    : "Unknown"}
                </Paragraph>
              </View>

              <View style={styles.infoRow}>
                <Paragraph
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Email verified:
                </Paragraph>
                <Paragraph
                  style={[
                    styles.infoValue,
                    {
                      color: user.emailVerified
                        ? theme.colors.primary
                        : theme.colors.error,
                    },
                  ]}
                >
                  {user.emailVerified ? "Yes" : "No"}
                </Paragraph>
              </View>
            </View>

            {children}

            <Button
              mode="contained"
              onPress={handleSignOut}
              loading={loading}
              disabled={loading}
              style={styles.signOutButton}
              buttonColor={theme.colors.error}
              contentStyle={styles.buttonContent}
            >
              Sign Out
            </Button>
          </Card.Content>
        </Card>
      </View>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError("")}
        duration={4000}
        action={{
          label: "Dismiss",
          onPress: () => setError(""),
        }}
      >
        {error}
      </Snackbar>

      <Snackbar
        visible={!!success}
        onDismiss={() => setSuccess("")}
        duration={3000}
      >
        {success}
      </Snackbar>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
  },
  cardContent: {
    alignItems: "center",
    paddingVertical: 24,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
  },
  divider: {
    width: "100%",
    marginBottom: 24,
  },
  infoSection: {
    width: "100%",
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
  },
  signOutButton: {
    width: "100%",
  },
  buttonContent: {
    paddingVertical: 8,
  },
});

export default ProfileScreen;
