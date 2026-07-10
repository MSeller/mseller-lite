import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../config/firebase";

/**
 * Uploads a proof-of-delivery photo to the same Firebase Storage bucket used by mseller-cloud
 * and returns its download URL. Stored under `entregas/<invoice>/<timestamp>.jpg`.
 */
export const uploadDeliveryPhoto = async (
  noPedidoStr: string,
  localUri: string
): Promise<string> => {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const safeDoc = (noPedidoStr || "doc").replace(/[^a-zA-Z0-9_-]/g, "_");
  const path = `entregas/${safeDoc}/${Date.now()}.jpg`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
  return await getDownloadURL(storageRef);
};
