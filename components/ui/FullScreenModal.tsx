import React from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { Modal } from "react-native-paper";

interface Props {
  visible: boolean;
  onDismiss: () => void;
  dismissable?: boolean;
  /** The sheet's own style, typically its background colour. */
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * A Paper `Modal` that covers the whole screen, status bar and home indicator included.
 *
 * Paper insets its modal wrapper by the safe area, which is right for a centred dialog but
 * wrong for a full-height sheet: an `Appbar.Header` inside adds the status bar height a
 * second time, the backdrop shows through above and below, and a `KeyboardAvoidingView`
 * measures itself against the wrong origin, leaving its last control under the keyboard.
 * Here the sheet starts at the top of the screen, so the header owns the top inset and the
 * content owns the bottom one (`useSafeAreaInsets().bottom`). Render it inside a `Portal`.
 */
const FullScreenModal: React.FC<Props> = ({ visible, onDismiss, dismissable, style, children }) => (
  <Modal
    visible={visible}
    onDismiss={onDismiss}
    dismissable={dismissable}
    style={styles.wrapper}
    contentContainerStyle={[styles.sheet, style]}
  >
    {children}
  </Modal>
);

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 0,
    marginBottom: 0,
  },
  sheet: {
    flex: 1,
    // The modal's `Surface` gives `flex` to the layer that holds the children only when the
    // style also sets a height; with `flex` alone the content collapses to the top.
    height: "100%",
    margin: 0,
    justifyContent: "flex-start",
  },
});

export default FullScreenModal;
