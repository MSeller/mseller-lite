import type { StatusTokens } from "../constants/Theme";
import type { EstadoSolicitud, EstadoVinculo } from "../types/b2b";

/**
 * Pure helpers for the marketplace screens: the invitation-code alphabet, the
 * idempotency key a purchase request travels with, how a failed call is described,
 * and which status colour each state gets.
 */

// ── Invitation code ─────────────────────────────────────────────────────────

/**
 * The alphabet the server issues codes from: no I, O, 0 or 1, because those are the
 * pairs someone reads wrong off a slip of paper or hears wrong over the phone.
 */
export const INVITATION_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const INVITATION_CODE_LENGTH = 8;

const ALLOWED = new Set(INVITATION_CODE_ALPHABET.split(""));

/**
 * What the user typed, as the server expects it: uppercase, with the spaces and hyphens
 * people add while reading a code aloud removed, and anything outside the alphabet
 * dropped rather than shown and then rejected on submit.
 *
 * Applied on every keystroke, so it also caps the length — a paste of something longer
 * cannot get past the field.
 */
export const normalizeInvitationCode = (raw: string): string =>
  raw
    .toUpperCase()
    .split("")
    .filter((character) => ALLOWED.has(character))
    .slice(0, INVITATION_CODE_LENGTH)
    .join("");

export const isCompleteInvitationCode = (code: string): boolean =>
  code.length === INVITATION_CODE_LENGTH;

// ── Idempotency ─────────────────────────────────────────────────────────────

/**
 * A UUID v4 for `idempotencyKey`.
 *
 * Generated once per checkout attempt and reused on retry: that is what makes a double
 * tap, or a resend after a request that timed out on a bad connection, return the
 * purchase request that already exists instead of creating a second one.
 *
 * Uses the platform's crypto when the runtime offers it and falls back to `Math.random`
 * otherwise (Hermes has no WebCrypto unless a polyfill is installed). The fallback is
 * fine here: the key only has to be unique among this device's in-flight requests, it is
 * not a secret and nothing is authorised with it.
 */
export const newIdempotencyKey = (): string => {
  // Typed structurally rather than as the DOM `Crypto`: React Native's runtime may have
  // neither, and this file must compile without lib.dom.
  const cryptoApi = (
    globalThis as {
      crypto?: {
        randomUUID?: () => string;
        getRandomValues?: (array: Uint8Array) => Uint8Array;
      };
    }
  ).crypto;
  if (typeof cryptoApi?.randomUUID === "function") return cryptoApi.randomUUID();

  const bytes = new Uint8Array(16);
  if (typeof cryptoApi?.getRandomValues === "function") {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }

  // Version 4, variant 10xx — the bits that make it a well-formed v4 UUID.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
    16,
    20
  )}-${hex.slice(20)}`;
};

// ── Failures ────────────────────────────────────────────────────────────────

export type B2BErrorKind =
  | "invalid"
  | "notFound"
  | "conflict"
  /** 429: the two link endpoints allow 10 attempts a minute. */
  | "rateLimited"
  | "forbidden"
  | "failed";

export interface B2BRequestError {
  kind: B2BErrorKind;
  /** The server's own Spanish message, when it sent one. */
  message: string | null;
}

/**
 * Reads a failed call. The server's message is preferred wherever it sent one — it is
 * written in Spanish for this user and knows more than the screen does — and the kind is
 * what decides the wording when it did not.
 */
export const describeB2BError = (error: unknown): B2BRequestError => {
  const response = (error as { response?: { status?: number; data?: unknown } } | null)?.response;
  const data = response?.data as { message?: unknown } | undefined;
  const message =
    data && typeof data.message === "string" && data.message.trim() ? data.message.trim() : null;

  switch (response?.status) {
    case 400:
      return { kind: "invalid", message };
    case 403:
      return { kind: "forbidden", message };
    case 404:
      return { kind: "notFound", message };
    case 409:
      return { kind: "conflict", message };
    case 429:
      // Deliberately drops the server message: the wording the user needs is "wait a
      // moment and try again", not whatever the rate limiter calls itself.
      return { kind: "rateLimited", message: null };
    default:
      return { kind: "failed", message };
  }
};

// ── Status colours ──────────────────────────────────────────────────────────

/** Link state → status palette tone. */
export const vinculoTone = (estado: EstadoVinculo): keyof StatusTokens => {
  switch (estado) {
    case "activa":
      return "positive";
    case "pendiente":
      return "warning";
    case "bloqueada":
    case "rechazada":
      return "negative";
    default:
      return "neutral";
  }
};

/** Purchase-request state → status palette tone. */
export const solicitudTone = (estado: EstadoSolicitud): keyof StatusTokens => {
  switch (estado) {
    case "aceptada":
      return "positive";
    case "enviada":
      return "warning";
    case "rechazada":
      return "negative";
    case "cancelada":
      return "neutral";
    default:
      return "neutral";
  }
};
