import { Pressable, Text, TextInput, type TextInputProps, View } from 'react-native';

import { colors } from '@/theme/colors';

export interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

export function FormField({ label, required, error, hint, children }: FormFieldProps) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted-light dark:text-text-muted">
        {label}
        {required ? <Text className="text-danger"> *</Text> : null}
      </Text>
      {children}
      {error ? <Text className="mt-1 text-xs text-danger">{error}</Text> : null}
      {!error && hint ? (
        <Text className="mt-1 text-xs text-text-muted-light dark:text-text-muted">{hint}</Text>
      ) : null}
    </View>
  );
}

export interface TextFieldProps extends TextInputProps {
  invalid?: boolean;
}

export function TextField({ invalid, ...props }: TextFieldProps) {
  return (
    <TextInput
      placeholderTextColor={colors.text.muted}
      className={`rounded-xl border bg-surface-light dark:bg-surface-dark px-3 py-3 text-base text-text-dark dark:text-text-light ${
        invalid ? 'border-danger' : 'border-border-light dark:border-border-dark'
      }`}
      {...props}
    />
  );
}

export interface SelectButtonProps {
  value?: string | null | undefined;
  placeholder: string;
  onPress: () => void;
  invalid?: boolean;
}

export function SelectButton({ value, placeholder, onPress, invalid }: SelectButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-xl border bg-surface-light dark:bg-surface-dark px-3 py-3 active:opacity-80 ${
        invalid ? 'border-danger' : 'border-border-light dark:border-border-dark'
      }`}
    >
      <Text
        className={`text-base ${
          value
            ? 'text-text-dark dark:text-text-light'
            : 'text-text-muted-light dark:text-text-muted'
        }`}
        numberOfLines={1}
      >
        {value ?? placeholder}
      </Text>
    </Pressable>
  );
}

export interface SegmentedProps<T extends string> {
  value: T | undefined;
  onChange: (next: T) => void;
  options: readonly { value: T; label: string }[];
}

export function Segmented<T extends string>({ value, onChange, options }: SegmentedProps<T>) {
  return (
    <View className="flex-row gap-2">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            className={`flex-1 items-center rounded-full border px-3 py-2 ${
              active
                ? 'border-primary bg-primary/20'
                : 'border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark'
            }`}
          >
            <Text
              className={`text-sm ${
                active ? 'text-primary' : 'text-text-dark dark:text-text-light'
              }`}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
