import { Image } from "expo-image";
import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Icon, useTheme } from "react-native-paper";

import type { CustomTheme } from "../../constants/Theme";
import { useTranslation } from "../../hooks/useTranslation";

interface Props {
  imagenes: string[];
  /** Horizontal padding the gallery sits inside, so a page is exactly one screen wide. */
  horizontalPadding?: number;
}

/**
 * The product's images.
 *
 * Three shapes, because a gallery that pretends is worse than one that does not: a
 * swipeable carousel with dots when there are several, a plain image when there is one
 * (dots under a single photo invite a swipe that does nothing), and a marked placeholder
 * when there are none.
 *
 * Built on `FlatList` + `pagingEnabled` rather than a carousel package — no new native
 * dependency for what amounts to a paged horizontal list.
 */
const ProductGallery: React.FC<Props> = ({ imagenes, horizontalPadding = 32 }) => {
  const theme = useTheme() as CustomTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const pageWidth = Math.max(1, width - horizontalPadding);

  const [page, setPage] = useState(0);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offset = event.nativeEvent.contentOffset.x;
      setPage(Math.round(offset / pageWidth));
    },
    [pageWidth]
  );

  if (imagenes.length === 0) {
    return (
      <View style={[styles.frame, styles.placeholder, { width: pageWidth }]}>
        <Icon source="image-off-outline" size={48} color={theme.colors.onSurfaceVariant} />
      </View>
    );
  }

  if (imagenes.length === 1) {
    return (
      <Image
        source={{ uri: imagenes[0] }}
        style={[styles.frame, { width: pageWidth }]}
        contentFit="cover"
        transition={150}
        accessibilityLabel={t("marketplace.productImage")}
      />
    );
  }

  return (
    <View>
      <FlatList
        data={imagenes}
        keyExtractor={(uri, index) => `${index}-${uri}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        // 16ms throttling keeps the dots in step with a slow drag, not only with the
        // settle at the end of a fling.
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item }}
            style={[styles.frame, { width: pageWidth }]}
            contentFit="cover"
            transition={150}
            accessibilityLabel={t("marketplace.productImage")}
          />
        )}
      />
      <View style={styles.dots}>
        {imagenes.map((uri, index) => (
          <View
            key={`${index}-${uri}`}
            style={[styles.dot, index === page ? styles.dotActive : null]}
          />
        ))}
      </View>
    </View>
  );
};

const createStyles = (theme: CustomTheme) =>
  StyleSheet.create({
    frame: {
      height: 280,
      borderRadius: theme.custom.radius.md,
      backgroundColor: theme.colors.surfaceVariant,
    },
    placeholder: {
      alignItems: "center",
      justifyContent: "center",
    },
    dots: {
      flexDirection: "row",
      alignSelf: "center",
      gap: 6,
      marginTop: 10,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: theme.colors.outline,
      opacity: 0.4,
    },
    dotActive: {
      backgroundColor: theme.colors.primary,
      opacity: 1,
      width: 18,
    },
  });

export default ProductGallery;
