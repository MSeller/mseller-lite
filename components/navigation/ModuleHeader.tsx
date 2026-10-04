import { useRouter } from "expo-router";
import React from "react";
import { Appbar } from "react-native-paper";

import { useTranslation } from "../../hooks/useTranslation";
import HeaderBackAction from "../ui/HeaderBackAction";

/**
 * The header of a module opened from Más: a back arrow and the module's name. The
 * module's own screen already pads for the status bar, so this adds none.
 */
export default function ModuleHeader({ title }: { title: string }) {
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <Appbar.Header mode="small" statusBarHeight={0}>
      <HeaderBackAction
        accessibilityLabel={t("common.back")}
        onPress={() => (router.canGoBack() ? router.back() : router.navigate("/(tabs)/more"))}
      />
      <Appbar.Content title={title} />
    </Appbar.Header>
  );
}
