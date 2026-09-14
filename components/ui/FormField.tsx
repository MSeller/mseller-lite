import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { HelperText, TextInput } from "react-native-paper";

type TextInputProps = React.ComponentProps<typeof TextInput>;

export interface FormFieldProps extends Omit<TextInputProps, "error" | "mode"> {
  /** The field's validation message. When set, the input is marked invalid and it shows underneath. */
  errorText?: string;
  /** A hint shown underneath while there is no error. */
  helperText?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * An outlined text input with its message underneath: the validation error when there
 * is one, otherwise the optional hint. Used by sign up and the catalog edit forms.
 */
const FormField: React.FC<FormFieldProps> = ({ errorText, helperText, containerStyle, ...inputProps }) => (
  <View style={containerStyle}>
    <TextInput mode="outlined" error={!!errorText} {...inputProps} />
    {errorText ? (
      <HelperText type="error" visible>
        {errorText}
      </HelperText>
    ) : helperText ? (
      <HelperText type="info" visible>
        {helperText}
      </HelperText>
    ) : null}
  </View>
);

export default FormField;
