import { httpsCallable } from "firebase/functions";

import { functions } from "../config/firebase";

/**
 * The media library — the same Firebase `uploadImages` callable the portal's media library
 * uses. Uploading through it (rather than straight to Storage) is what gives an image its
 * thumbnail, its media id and its place in the portal's library, and the tenant comes from
 * the caller's token on the server, never from here.
 */

/** Where the callable files an image. Mirrors the callable's accepted values. */
export type MediaType = "products" | "profile" | "documents" | "receipt";

/** One stored image as the callable returns it. */
export interface MediaItem {
  id: string;
  originalFile: string;
  thumbnailFile: string;
  originalUrl: string;
  thumbnailUrl: string;
}

interface UploadImagesRequest {
  /** `data:image/jpeg;base64,…` or `data:image/png;base64,…` */
  images: string[];
  type: MediaType;
}

interface UploadImagesResponse {
  uploads: MediaItem[];
}

/**
 * The largest image we send. Firebase callables reject requests over 10 MB, and base64 adds a
 * third on top of the file; refusing here gives a message the user can act on instead of an
 * opaque failure from the transport.
 */
const MAX_BASE64_LENGTH = 7 * 1024 * 1024;

export class ImageTooLargeError extends Error {
  constructor() {
    super("IMAGE_TOO_LARGE");
    this.name = "ImageTooLargeError";
  }
}

/** Builds the data URI the callable expects from picker output. */
export const toImageDataUri = (base64: string, mimeType?: string): string => {
  // The callable accepts JPEG and PNG. The picker re-encodes to JPEG when a quality is set,
  // so anything that is not explicitly PNG is sent as JPEG.
  const tipo = mimeType === "image/png" ? "png" : "jpeg";
  return `data:image/${tipo};base64,${base64}`;
};

/**
 * Uploads images to the media library and returns them in the same order. The callable
 * rejects the whole request if any one image fails, so a resolved promise means every image
 * was stored.
 */
export const uploadImages = async (dataUris: string[], type: MediaType): Promise<MediaItem[]> => {
  if (dataUris.some((uri) => uri.length > MAX_BASE64_LENGTH)) throw new ImageTooLargeError();

  const fn = httpsCallable<UploadImagesRequest, UploadImagesResponse>(functions, "uploadImages");
  const { data } = await fn({ images: dataUris, type });
  return data.uploads;
};
