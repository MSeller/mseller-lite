import { replaceLocalhostWithEmulatorHost } from "../config/environment";
import { toImageDataUri, uploadImages } from "../services/mediaService";
import type { ProductPhoto } from "../types/documents";
import { capturePhoto, type PhotoSource } from "./photoCapture";

/** The fields of an image row the thumbnail choice needs — both API shapes carry them. */
interface ImageRowLike {
  rutaPublica?: string | null;
  tipoImagen?: string | null;
  esImagenPredeterminada?: boolean;
  ordenVisualizacion?: number;
}

/**
 * The image to show for a product in a list: its default thumbnail, else any thumbnail, else
 * its default original. Rows added by the portal or this app come in original/thumbnail pairs;
 * older rows may carry no variant at all, which is why the original is a fallback.
 */
export const productThumbnailUrl = (imagenes?: ImageRowLike[] | null): string | null => {
  const conUrl = (imagenes ?? []).filter((i) => !!i.rutaPublica);
  if (conUrl.length === 0) return null;

  const orden = [...conUrl].sort(
    (a, b) =>
      Number(!!b.esImagenPredeterminada) - Number(!!a.esImagenPredeterminada) ||
      (a.ordenVisualizacion ?? 0) - (b.ordenVisualizacion ?? 0)
  );

  const url = (orden.find((i) => i.tipoImagen === "thumbnail") ?? orden[0]).rutaPublica;

  // Against the local Storage emulator the URL says 127.0.0.1, which on a device is the
  // device itself. No effect on production URLs.
  return url ? replaceLocalhostWithEmulatorHost(url) : null;
};

export interface UploadedProductPhoto {
  /** Local URI, shown immediately while the product request goes out. */
  preview: string;
  photo: ProductPhoto;
}

/**
 * Takes or chooses a product photo and uploads it to the media library.
 *
 * Square-cropped and compressed on the device: a catalogue thumbnail is square, and a
 * full-resolution phone photo would be several megabytes of upload over a mobile connection
 * for an image the server resizes anyway. Returns `null` if the user backed out.
 */
export const pickAndUploadProductPhoto = async (
  source: PhotoSource
): Promise<UploadedProductPhoto | null> => {
  const foto = await capturePhoto(source, {
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.6,
    base64: true,
  });
  if (!foto?.base64) return null;

  const [media] = await uploadImages([toImageDataUri(foto.base64, foto.mimeType)], "products");

  return {
    preview: foto.uri,
    photo: { idObjeto: media.id, urlOriginal: media.originalUrl, urlMiniatura: media.thumbnailUrl },
  };
};
