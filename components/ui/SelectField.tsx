import React from "react";
import { Pressable, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { TextInput } from "react-native-paper";

interface Props {
  label: string;
  /** The selected option's label, as shown in the field. */
  value: string;
  placeholder?: string;
  onPress: () => void;
  disabled?: boolean;
  /** Spacing around the field. */
  style?: StyleProp<ViewStyle>;
  /** Passed to the input itself, e.g. its background on a white card. */
  inputStyle?: StyleProp<TextStyle>;
}

/**
 * A read-only outlined field that opens a picker (usually `OptionPickerModal`), so a
 * choice looks like the text inputs around it.
 *
 * It is one control: the pressable is the button, labelled with the field and its
 * current value. The input inside never takes touches or focus and is hidden from
 * assistive technology, which would otherwise announce a second, uneditable text field.
 */
const SelectField: React.FC<Props> = ({ label, value, placeholder, onPress, disabled, style, inputStyle }) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    style={style}
    accessible
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityValue={{ text: value || placeholder || "" }}
    accessibilityState={{ disabled: !!disabled }}
  >
    <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants">
      <TextInput
        mode="outlined"
        label={label}
        placeholder={placeholder}
        value={value}
        editable={false}
        disabled={disabled}
        style={inputStyle}
        accessible={false}
        right={<TextInput.Icon icon="chevron-down" />}
      />
    </View>
  </Pressable>
);

export default SelectField;
