import { useCallback, useEffect, useRef, useState } from "react";

interface Options {
  /** Fetch only while this is true, e.g. while the form is open. */
  enabled: boolean;
  /** Wait for typing to settle before asking, when the suggestion depends on input. */
  debounceMs?: number;
}

export interface SuggestedCode {
  /** What the code field shows: the suggestion until the user types their own. */
  value: string;
  onChangeText: (text: string) => void;
  /**
   * What to send when saving. `undefined` while the user has kept the suggestion, so the
   * server assigns the code itself — for customers that is what advances the numbering
   * sequence; sending the previewed code back would bypass it.
   */
  codeForRequest: string | undefined;
  loading: boolean;
  reset: () => void;
}

/**
 * A code field that is filled in automatically and can be overwritten.
 *
 * The suggestion is a server preview (nothing is reserved), refreshed whenever `deps` change
 * — for a product that is the name — until the user edits the field. From then on their code
 * is left alone. Shared by the customer and product forms so both behave the same.
 */
export const useSuggestedCode = (
  fetchSuggestion: () => Promise<string | null | undefined>,
  deps: unknown[],
  { enabled, debounceMs = 0 }: Options
): SuggestedCode => {
  const [value, setValue] = useState("");
  const [edited, setEdited] = useState(false);
  const [loading, setLoading] = useState(false);

  // The latest fetcher without making every render a new effect dependency.
  const fetchRef = useRef(fetchSuggestion);
  fetchRef.current = fetchSuggestion;

  useEffect(() => {
    if (!enabled || edited) return;

    let activo = true;
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const sugerido = await fetchRef.current();
        if (activo) setValue(sugerido?.trim() ?? "");
      } catch {
        // A preview that cannot load is not an error: the field stays empty and the server
        // still assigns a code on save.
        if (activo) setValue("");
      } finally {
        if (activo) setLoading(false);
      }
    }, debounceMs);

    return () => {
      activo = false;
      clearTimeout(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, edited, debounceMs, ...deps]);

  const onChangeText = useCallback((text: string) => {
    setEdited(true);
    setValue(text);
  }, []);

  const reset = useCallback(() => {
    setEdited(false);
    setValue("");
  }, []);

  const trimmed = value.trim();
  return {
    value,
    onChangeText,
    codeForRequest: edited && trimmed ? trimmed : undefined,
    loading,
    reset,
  };
};
