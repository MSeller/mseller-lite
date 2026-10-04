import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Card,
  Divider,
  Icon,
  Menu,
  Paragraph,
  Snackbar,
  Title,
  useTheme,
} from "react-native-paper";
import { CustomTheme } from "../../constants/Theme";
import { useUser } from "../../contexts/UserContext";
import { useTranslation } from "../../hooks/useTranslation";
import { ImageTooLargeError } from "../../services/mediaService";
import { changeProfilePhoto, signOutCompletely } from "../../services/accountService";
import { PhotoPermissionError, type PhotoSource } from "../../utils/photoCapture";
import UserAvatar from "../ui/UserAvatar";
import { useBottomTabOverflow } from "../ui/TabBarBackground";
import AppButton from "../ui/AppButton";

interface ProfileScreenProps {
  /** Extra settings rows, shown above Sign Out (the Más tab adds language and developer tools). */
  children?: React.ReactNode;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ children }) => {
  const { user, userProfile, refreshUserProfile } = useUser();
  const [photoMenu, setPhotoMenu] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  // The new photo shows at once; the profile refresh catches up behind it.
  const [newPhoto, setNewPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const theme = useTheme() as CustomTheme;
  const { t, currentLanguage } = useTranslation();

  const handleSignOut = async () => {
    setLoading(true);
    setError("");

    try {
      await signOutCompletely();
      setSuccess(t("auth.signOut"));
    } catch (error: any) {
      console.error("Sign out error:", error);
      setError(t("errors.genericError"));
    } finally {
      setLoading(false);
    }
  };

  const handleChangePhoto = async (source: PhotoSource) => {
    setPhotoMenu(false);
    setUploadingPhoto(true);
    setError("");
    try {
      const url = await changeProfilePhoto(source);
      if (url) {
        setNewPhoto(url);
        setSuccess(t("profile.photoUpdated"));
        await refreshUserProfile();
      }
    } catch (e) {
      setError(
        e instanceof PhotoPermissionError
          ? t("profile.photoPermission")
          : e instanceof ImageTooLargeError
            ? t("documents.productPhoto.tooLarge")
            : t("profile.photoFailed")
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString(currentLanguage, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const tabOverflow = useBottomTabOverflow();

  if (!user) {
    return null;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      // iOS draws the tab bar over the screen; without this the last rows (Cerrar sesión)
      // sit under it and cannot be reached.
      contentContainerStyle={{ paddingBottom: tabOverflow }}
    >
      <View style={styles.content}>
        <Card elevation={0} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content style={styles.cardContent}>
            <Menu
              visible={photoMenu}
              onDismiss={() => setPhotoMenu(false)}
              anchor={
                <Pressable
                  onPress={() => setPhotoMenu(true)}
                  disabled={uploadingPhoto}
                  style={styles.avatarContainer}
                  accessibilityRole="button"
                  accessibilityLabel={t("profile.changePhoto")}
                >
                  <UserAvatar
                    size={88}
                    photoURL={newPhoto || userProfile?.photoURL || user.photoURL}
                    name={[userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(" ") || user.displayName}
                  />
                  <View
                    style={[
                      styles.photoBadge,
                      { backgroundColor: theme.custom.colors.tint, borderColor: theme.colors.surface },
                    ]}
                  >
                    {uploadingPhoto ? (
                      <ActivityIndicator size={14} color={theme.colors.onPrimary} />
                    ) : (
                      <Icon source="camera" size={16} color={theme.colors.onPrimary} />
                    )}
                  </View>
                </Pressable>
              }
            >
              <Menu.Item
                leadingIcon="camera-outline"
                title={t("documents.productPhoto.takePhoto")}
                onPress={() => handleChangePhoto("camera")}
              />
              <Menu.Item
                leadingIcon="image-outline"
                title={t("documents.productPhoto.choosePhoto")}
                onPress={() => handleChangePhoto("library")}
              />
            </Menu>

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
                    {t("profile.businessInfo")}
                  </Title>

                  <View style={styles.infoRow}>
                    <Paragraph
                      style={[
                        styles.infoLabel,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      {t("profile.company")}
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
                      {t("profile.role")}
                    </Paragraph>
                    <Paragraph
                      style={[
                        styles.infoValue,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      {t(`home.userTypes.${userProfile.type}`)}
                    </Paragraph>
                  </View>

                  <View style={styles.infoRow}>
                    <Paragraph
                      style={[
                        styles.infoLabel,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      {t("profile.sellerCode")}
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
                      {t("profile.mode")}
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
                      {userProfile.testMode ? t("profile.testMode") : t("profile.production")}
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
                  {t("profile.accountCreated")}
                </Paragraph>
                <Paragraph
                  style={[styles.infoValue, { color: theme.colors.onSurface }]}
                >
                  {user.metadata.creationTime
                    ? formatDate(user.metadata.creationTime)
                    : t("profile.unknown")}
                </Paragraph>
              </View>

              <View style={styles.infoRow}>
                <Paragraph
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {t("profile.lastSignIn")}
                </Paragraph>
                <Paragraph
                  style={[styles.infoValue, { color: theme.colors.onSurface }]}
                >
                  {user.metadata.lastSignInTime
                    ? formatDate(user.metadata.lastSignInTime)
                    : t("profile.unknown")}
                </Paragraph>
              </View>

              <View style={styles.infoRow}>
                <Paragraph
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {t("profile.emailVerified")}
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
                  {user.emailVerified ? t("profile.yes") : t("profile.no")}
                </Paragraph>
              </View>
            </View>

            {children}

            <AppButton
              mode="contained"
              onPress={handleSignOut}
              loading={loading}
              disabled={loading}
              style={styles.signOutButton}
              buttonColor={theme.colors.error}
              contentStyle={styles.buttonContent}
            >
              {t("auth.signOut")}
            </AppButton>
          </Card.Content>
        </Card>
      </View>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError("")}
        duration={4000}
        action={{
          label: t("common.close"),
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
  // A circle: the radius is half the badge's own size (geometry, not a token).
  photoBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 30 / 2,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
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
