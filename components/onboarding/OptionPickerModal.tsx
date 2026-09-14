import React, { useMemo, useState } from "react";
import { FlatList, StyleSheet } from "react-native";
import { Appbar, Divider, List, Modal, Portal, Searchbar, useTheme } from "react-native-paper";

import type { CustomTheme } from "../../constants/Theme";

export interface PickerOption {
  value: string;
  label: string;
}

interface Props {
  visible: boolean;
  title: string;
  options: PickerOption[];
  selected: string;
  /** Shows a search box; worth it for long lists such as countries. */
  searchPlaceholder?: string;
  onDismiss: () => void;
  onSelect: (value: string) => void;
}

/** Full-screen single choice list, the app's stand-in for the portal's Autocomplete. */
const OptionPickerModal: React.FC<Props> = ({
  visible,
  title,
  options,
  selected,
  searchPlaceholder,
  onDismiss,
  onSelect,
}) => {
  const theme = useTheme() as CustomTheme;
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return term ? options.filter((o) => o.label.toLocaleLowerCase().includes(term)) : options;
  }, [options, search]);

  const close = () => {
    setSearch("");
    onDismiss();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={close}
        contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
      >
        <Appbar.Header mode="small" style={{ backgroundColor: theme.colors.surface }}>
          <Appbar.Action icon="close" onPress={close} />
          <Appbar.Content title={title} />
        </Appbar.Header>
        {searchPlaceholder && (
          <Searchbar
            placeholder={searchPlaceholder}
            value={search}
            onChangeText={setSearch}
            style={styles.search}
            autoCorrect={false}
          />
        )}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.value}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={Divider}
          renderItem={({ item }) => (
            <List.Item
              title={item.label}
              onPress={() => {
                onSelect(item.value);
                close();
              }}
              right={(props) =>
                item.value === selected ? (
                  <List.Icon {...props} icon="check" color={theme.colors.primary} />
                ) : null
              }
            />
          )}
        />
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    flex: 1,
  },
  search: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
});

export default OptionPickerModal;
