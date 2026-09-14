import { useCallback, useMemo, useRef, useState } from "react";

import { useTranslation } from "../../hooks/useTranslation";
import {
  describeCatalogError,
  hasErrors,
  isFormDirty,
  type FieldErrors,
} from "../../utils/catalogValidation";

interface Options<F extends object, R> {
  initial: F;
  validate: (form: F) => FieldErrors<Extract<keyof F, string>>;
  save: (form: F) => Promise<R>;
  onSaved: (result: R) => void;
  /** Message for a 409, when the server sent none. */
  conflictMessage: string;
}

/**
 * State for a catalog edit form: field values, validation shown once the user has
 * tried to save (then kept live so a fixed field clears its message), the dirty flag
 * for the discard prompt, and the save call with the server's message on failure.
 */
export const useCatalogForm = <F extends object, R>({
  initial,
  validate,
  save,
  onSaved,
  conflictMessage,
}: Options<F, R>) => {
  const { t } = useTranslation();
  const initialRef = useRef(initial);
  const [form, setForm] = useState<F>(initial);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const setField = useCallback(<K extends keyof F>(field: K, value: F[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  }, []);

  const liveErrors = useMemo(() => validate(form), [validate, form]);
  const errors: FieldErrors<Extract<keyof F, string>> = attempted ? liveErrors : {};
  const dirty = isFormDirty(initialRef.current, form);

  const submit = useCallback(async () => {
    setAttempted(true);
    setError("");
    if (hasErrors(liveErrors)) {
      setError(t("catalog.fixErrors"));
      return;
    }

    setSaving(true);
    try {
      const result = await save(form);
      onSaved(result);
    } catch (e) {
      const failure = describeCatalogError(e);
      setError(
        failure.message ||
          (failure.kind === "forbidden"
            ? t("catalog.forbiddenBody")
            : failure.kind === "notFound"
              ? t("catalog.notFound")
              : failure.kind === "conflict"
                ? conflictMessage
                : t("catalog.saveFailed"))
      );
    } finally {
      setSaving(false);
    }
  }, [liveErrors, save, form, onSaved, conflictMessage, t]);

  return { form, setField, errors, dirty, saving, error, submit };
};
