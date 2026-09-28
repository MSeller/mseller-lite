import { User } from "firebase/auth";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { updateAxiosConfig } from "../services/api";
import { initializeUserSession } from "../services/userService";
import { USER_TYPES, UserTypes } from "../types/user";
import { isProfileNotFound } from "../utils/account";
import { useAuth } from "./AuthContext";

interface UserContextType {
  user: User | null;
  userProfile: UserTypes | null;
  loading: boolean;
  error: string | null;
  /** Signed in (e.g. with Google) but without an MSeller account: offer to create a business. */
  profileMissing: boolean;
  refreshUserProfile: () => Promise<void>;
  /**
   * Development builds only: the user type the app pretends the signed-in user has, so
   * every role's navigation can be checked from one account. The token is unchanged, so
   * the API still answers for the real role. Always null in production builds.
   */
  previewUserType: UserTypes["type"] | null;
  setPreviewUserType: (type: UserTypes["type"] | null) => void;
}

const UserContext = createContext<UserContextType>({
  user: null,
  userProfile: null,
  loading: true,
  error: null,
  profileMissing: false,
  refreshUserProfile: async () => {},
  previewUserType: null,
  setPreviewUserType: () => {},
});

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

interface UserProviderProps {
  children: React.ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [userProfile, setUserProfile] = useState<UserTypes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileMissing, setProfileMissing] = useState(false);
  const [previewUserType, setPreviewUserTypeState] = useState<UserTypes["type"] | null>(null);
  // The setter is inert outside development builds, so the preview cannot be reached by
  // any production code path and `previewUserType` stays null there.
  const setPreviewUserType = useCallback((type: UserTypes["type"] | null) => {
    if (__DEV__) setPreviewUserTypeState(type);
  }, []);
  // Development builds can be started with `EXPO_PUBLIC_PREVIEW_ROLE=<type>` on the Metro
  // command line, so every role's navigation can be captured from a script without
  // touching the menu under Más. Inlined at bundle time; absent in production builds.
  useEffect(() => {
    const type = process.env.EXPO_PUBLIC_PREVIEW_ROLE as UserTypes["type"] | undefined;
    if (__DEV__ && type && USER_TYPES.includes(type)) setPreviewUserTypeState(type);
  }, []);
  // `EXPO_PUBLIC_PREVIEW_WAREHOUSE=<id>` pairs with the role preview for warehouse screens.
  const previewWarehouse = __DEV__ ? process.env.EXPO_PUBLIC_PREVIEW_WAREHOUSE : undefined;
  const effectiveProfile = useMemo(() => {
    if (!userProfile || (!previewUserType && !previewWarehouse)) return userProfile;
    return {
      ...userProfile,
      ...(previewUserType && { type: previewUserType }),
      ...(previewWarehouse && { warehouse: previewWarehouse }),
    };
  }, [userProfile, previewUserType, previewWarehouse]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) {
        setUserProfile(null);
        setProfileMissing(false);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const profile = await initializeUserSession();
        setUserProfile(profile || null);
        setProfileMissing(false);

        // Update axios configuration with user's business config
        if (profile?.business?.config) {
          updateAxiosConfig(profile.business.config, profile.testMode);
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch user profile"
        );
        setProfileMissing(isProfileNotFound((err as Error)?.message));
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchUserProfile();
    }
  }, [user, authLoading]);

  const refreshUserProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const profile = await initializeUserSession();
      setUserProfile(profile || null);
      setProfileMissing(false);

      // Update axios configuration with user's business config
      if (profile?.business?.config) {
        updateAxiosConfig(profile.business.config, profile.testMode);
      }
    } catch (err) {
      console.error("Error refreshing user profile:", err);
      setProfileMissing(isProfileNotFound((err as Error)?.message));
      setError(
        err instanceof Error ? err.message : "Failed to refresh user profile"
      );
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    userProfile: effectiveProfile,
    loading: authLoading || loading,
    error,
    profileMissing,
    refreshUserProfile,
    previewUserType,
    setPreviewUserType,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
