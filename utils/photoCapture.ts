import * as ImagePicker from "expo-image-picker";

/**
 * Taking or choosing a photo — the one place the app asks for the camera.
 *
 * Every screen that needs a picture (proof of delivery, product photos) goes through here, so
 * the permission prompt, the cancel handling and the picker options stay consistent instead
 * of being re-implemented per screen.
 */

export type PhotoSource = "camera" | "library";

export interface CapturedPhoto {
  uri: string;
  /** Present when `base64: true` was requested. */
  base64?: string | null;
  mimeType?: string;
}

/** The user refused access. The screen turns this into its own message. */
export class PhotoPermissionError extends Error {
  constructor(public readonly source: PhotoSource) {
    super("PHOTO_PERMISSION_DENIED");
    this.name = "PhotoPermissionError";
  }
}

/**
 * Opens the camera or the photo library and returns the picked image, or `null` if the user
 * backed out.
 *
 * Only the camera asks for permission first. The library goes through the system photo
 * picker, which needs none — requesting it anyway would show an unnecessary prompt and add
 * a broad media permission the app does not use.
 */
export const capturePhoto = async (
  source: PhotoSource,
  options: ImagePicker.ImagePickerOptions = {}
): Promise<CapturedPhoto | null> => {
  if (source === "camera") {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) throw new PhotoPermissionError(source);
  }

  const opciones: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], ...options };
  const resultado =
    source === "camera"
      ? await ImagePicker.launchCameraAsync(opciones)
      : await ImagePicker.launchImageLibraryAsync(opciones);

  if (resultado.canceled || !resultado.assets?.length) return null;

  const asset = resultado.assets[0];
  return { uri: asset.uri, base64: asset.base64, mimeType: asset.mimeType };
};
