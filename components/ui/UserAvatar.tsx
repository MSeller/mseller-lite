import React, { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Icon, useTheme } from "react-native-paper";

import type { CustomTheme } from "../../constants/Theme";
import { remoteImageUrl } from "../../utils/remoteImage";

interface Props {
  size: number;
  /** The profile photo; the initials show while it loads and whenever it cannot load. */
  photoURL?: string | null;
  /** Full name or display name — its first two initials are the fallback. */
  name?: string | null;
}

const initialsOf = (name?: string | null): string =>
  (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);

/**
 * The signed-in user's avatar: photo over initials on a soft tint well.
 *
 * Paper's `Avatar.Image` paints a solid `primary` disc behind the picture, so a photo URL that
 * no longer loads (an expired Google photo, a deleted upload) used to read as a blank blue
 * circle. Here the initials are always underneath and a failed load simply drops the photo.
 */
const UserAvatar: React.FC<Props> = ({ size, photoURL, name }) => {
  const theme = useTheme() as CustomTheme;
  const { colors } = theme.custom;
  const uri = remoteImageUrl(photoURL);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);

  const initials = initialsOf(name);
  // A circle: the radius is half the avatar's own size (geometry, not a token).
  const shape = useMemo(
    () => ({ width: size, height: size, borderRadius: size / 2 }),
    [size]
  );

  return (
    <View style={[styles.well, shape, { backgroundColor: colors.tintSoft }]}>
      {initials ? (
        <Text
          style={[theme.custom.type.figure(Math.round(size * 0.38)), { color: colors.tint }]}
          allowFontScaling={false}
        >
          {initials}
        </Text>
      ) : (
        <Icon source="account" size={Math.round(size * 0.55)} color={colors.tint} />
      )}
      {!!uri && !failed && (
        <Image source={{ uri }} style={[StyleSheet.absoluteFill, shape]} onError={() => setFailed(true)} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  well: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});

export default UserAvatar;
