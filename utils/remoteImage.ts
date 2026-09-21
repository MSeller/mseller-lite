import { replaceLocalhostWithEmulatorHost } from "../config/environment";

/**
 * Makes an image URL that came from the API actually loadable on a device.
 *
 * Against the local Firebase Storage emulator, uploaded files come back addressed as
 * `http://127.0.0.1:9199/...`. On a phone that host is the phone itself, so the image simply
 * never loads and the UI falls back to its placeholder — which reads as "this business has no
 * logo" rather than "this URL is unreachable from here", and sends you looking in the wrong
 * place. Same trap as the onboarding 404: a loopback address handed to a device.
 *
 * No effect on production URLs: the rewrite only touches `localhost` / `127.0.0.1`.
 */
export const remoteImageUrl = (url?: string | null): string | null =>
  url ? replaceLocalhostWithEmulatorHost(url) : null;
