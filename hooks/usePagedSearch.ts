import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

export const SEARCH_DEBOUNCE_MS = 350;

export interface SearchPage<T> {
  items: T[];
  hasMore: boolean;
}

interface Options<T> {
  /** The text as typed; the request goes out once it stops changing for `debounceMs`. */
  query: string;
  /** Loads one page (1-based). Keep it stable (module level or useCallback). */
  fetchPage: (query: string, page: number) => Promise<SearchPage<T>>;
  /** While false nothing is fetched and the results are cleared (a closed picker). */
  enabled?: boolean;
  debounceMs?: number;
}

export interface PagedSearch<T> {
  items: T[];
  /** For patching rows in place — a saved record, a photo just attached. */
  setItems: Dispatch<SetStateAction<T[]>>;
  /** True from the first keystroke until the first page for that text lands. */
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  /** The failure of the last request, as thrown; `null` after a success. */
  error: unknown;
  /** Reloads page 1 for the current text (pull to refresh). */
  refresh: () => Promise<void>;
  /** Next page, unless one is loading, there is none, or the last request failed. */
  loadMore: () => void;
  /** After a failure: fetches the page that failed (next page, or page 1). */
  retry: () => void;
}

/**
 * Debounced search with optional paging — the pattern behind the document form's
 * customer and product pickers and the admin catalog lists.
 *
 * Typing a name does not fire a request per keystroke, and every request carries a
 * generation number: a slow answer for old text (or a page that was loading when the
 * text changed) cannot land after the new one and repopulate the list with rows that
 * no longer match.
 */
export const usePagedSearch = <T>({
  query,
  fetchPage,
  enabled = true,
  debounceMs = SEARCH_DEBOUNCE_MS,
}: Options<T>): PagedSearch<T> => {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const generation = useRef(0);

  const load = useCallback(
    async (text: string, pageNumber: number, append: boolean) => {
      const mine = ++generation.current;
      try {
        const result = await fetchPage(text, pageNumber);
        if (generation.current !== mine) return;
        setItems((current) => (append ? [...current, ...result.items] : result.items));
        setHasMore(result.hasMore);
        setPage(pageNumber);
        setError(null);
      } catch (e) {
        if (generation.current !== mine) return;
        // A failed "load more" keeps what the user is already reading.
        if (!append) setItems([]);
        setError(e ?? new Error("Search failed"));
      }
    },
    [fetchPage]
  );

  useEffect(() => {
    if (!enabled) {
      generation.current++;
      setItems([]);
      setHasMore(false);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    const handle = setTimeout(() => {
      load(query, 1, false).finally(() => {
        if (active) setLoading(false);
      });
    }, debounceMs);

    return () => {
      active = false;
      // Invalidates a request already in flight for the previous text.
      generation.current++;
      clearTimeout(handle);
    };
  }, [enabled, query, debounceMs, load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load(query, 1, false);
    setRefreshing(false);
  }, [load, query]);

  const fetchMore = useCallback(async () => {
    setLoadingMore(true);
    await load(query, page + 1, true);
    setLoadingMore(false);
  }, [load, query, page]);

  // Stops at a failure: onEndReached fires repeatedly near the bottom, and retrying a
  // broken page in a loop is the user's call, made from `retry`.
  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore || error) return;
    fetchMore();
  }, [loading, loadingMore, hasMore, error, fetchMore]);

  const retry = useCallback(() => {
    if (items.length > 0 && hasMore) {
      setError(null);
      fetchMore();
    } else {
      refresh();
    }
  }, [items.length, hasMore, fetchMore, refresh]);

  return { items, setItems, loading, refreshing, loadingMore, hasMore, error, refresh, loadMore, retry };
};
