import { toPrinterError } from "../../services/printing/printerService";

type Translate = (key: string, options?: Record<string, unknown>) => string;

/**
 * A printer failure in words the seller can act on ("turn on Bluetooth"), not the native
 * message. A failed HTTP request (fetching the ticket) keeps the server's own message.
 */
export function describePrinterError(error: unknown, t: Translate): string {
  const response = (error as { response?: { status?: number; data?: { message?: string } } } | null)?.response;
  if (response) {
    if (response.status === 403) return t("documents.errors.forbidden");
    if (response.status === 404) return t("documents.errors.notFound");
    return response.data?.message || t("documents.share.ticketLoadFailed");
  }
  const { code } = toPrinterError(error);
  return t(`printers.errors.${code}`);
}
