import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler } from "react-native";

import { describeCatalogError, type CatalogRequestError } from "../../utils/catalogValidation";

export interface CatalogRecordState<T> {
  record: T | null;
  /** Replaces the record with what a save returned, without another round trip. */
  setRecord: (record: T) => void;
  loading: boolean;
  failure: CatalogRequestError | null;
  reload: () => void;
}

/** Loads one editable record (`/editable`) and keeps the latest request's answer only. */
export const useCatalogRecord = <T>(
  codigo: string,
  loader: (codigo: string) => Promise<T>
): CatalogRecordState<T> => {
  const [record, setRecord] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<CatalogRequestError | null>(null);
  const generation = useRef(0);

  const reload = useCallback(async () => {
    const mine = ++generation.current;
    setLoading(true);
    try {
      const result = await loader(codigo);
      if (generation.current !== mine) return;
      setRecord(result);
      setFailure(null);
    } catch (e) {
      if (generation.current !== mine) return;
      setFailure(describeCatalogError(e));
    } finally {
      if (generation.current === mine) setLoading(false);
    }
  }, [codigo, loader]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { record, setRecord, loading, failure, reload };
};

/**
 * Android's back button, while this tab is the one on screen. Tabs stay mounted in
 * the background, so a listener that ignored focus would swallow back presses meant
 * for another tab. Return true from `onBack` when it was handled.
 */
export const useHardwareBack = (onBack: () => boolean) => {
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener("hardwareBackPress", onBack);
      return () => subscription.remove();
    }, [onBack])
  );
};
