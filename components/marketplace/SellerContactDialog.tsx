import React, { useCallback, useEffect, useState } from "react";
import { Linking } from "react-native";
import { Button, Dialog, List, Portal, Text } from "react-native-paper";

import { useTranslation } from "../../hooks/useTranslation";
import { getStoreSeller } from "../../services/b2bService";
import type { VendedorContacto } from "../../types/b2b";

/**
 * The store's sales rep, when the store shares one.
 *
 * `GET …/vendedor` answers **204 No Content** for a store that keeps its rep private.
 * That is a normal answer, not a failure — the service maps it to `null` and this hook
 * reports `available: false`, so the screen simply does not offer "Contactar vendedor"
 * rather than showing an affordance that leads to an error.
 */
export const useSellerContact = (tiendaId: string) => {
  const [contact, setContact] = useState<VendedorContacto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getStoreSeller(tiendaId)
      .then((value) => {
        if (active) setContact(value);
      })
      // A failed lookup is treated like "not shared": the contact is a nicety next to
      // the catalogue, and a banner about it would only get in the way of shopping.
      .catch(() => {
        if (active) setContact(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [tiendaId]);

  const hasSomething = !!(contact?.nombre || contact?.telefono);

  return { contact, loading, available: hasSomething };
};

interface Props {
  visible: boolean;
  onDismiss: () => void;
  contact: VendedorContacto | null;
}

const SellerContactDialog: React.FC<Props> = ({ visible, onDismiss, contact }) => {
  const { t } = useTranslation();

  const call = useCallback(() => {
    if (contact?.telefono) Linking.openURL(`tel:${contact.telefono.replace(/\s/g, "")}`);
  }, [contact]);

  const whatsapp = useCallback(() => {
    if (!contact?.telefono) return;
    // WhatsApp is how a colmado actually reaches its rep here; the digits-only form is
    // what the wa.me link takes.
    const digits = contact.telefono.replace(/\D/g, "");
    if (digits) Linking.openURL(`https://wa.me/${digits}`);
  }, [contact]);

  if (!contact) return null;

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>{t("marketplace.sellerTitle")}</Dialog.Title>
        <Dialog.Content>
          {!!contact.nombre && (
            <List.Item
              title={contact.nombre}
              description={contact.codigo}
              left={(props) => <List.Icon {...props} icon="account-tie-outline" />}
            />
          )}
          {contact.telefono ? (
            <List.Item
              title={contact.telefono}
              left={(props) => <List.Icon {...props} icon="phone-outline" />}
              onPress={call}
            />
          ) : (
            <Text variant="bodyMedium">{t("marketplace.sellerNoPhone")}</Text>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>{t("common.close")}</Button>
          {!!contact.telefono && <Button onPress={whatsapp}>{t("marketplace.sellerWhatsapp")}</Button>}
          {!!contact.telefono && (
            <Button mode="contained" onPress={call}>
              {t("marketplace.sellerCall")}
            </Button>
          )}
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

export default SellerContactDialog;
