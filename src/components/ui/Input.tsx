import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import type { KeyboardTypeOptions, TextInputProps } from 'react-native';

import { cn } from '@/lib/cn';
import { colors, MIN_TAP_TARGET } from '@/lib/theme/tokens';

const BASE = 'rounded-lg border bg-surface px-3 py-3 text-base text-ink-900';

/** ui-registry.md "Input focused / error". Error outranks focus — a wrong value stays red. */
const BORDER = {
  default: 'border-border',
  focused: 'border-brand-600',
  error: 'border-danger-600',
} as const;

export interface InputProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  /** Shown under the field in danger colour, and announced to screen readers. */
  error?: string;
  /** Shown under the field when there is no error. Guidance, not a warning. */
  hint?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
  secureTextEntry?: boolean;
  editable?: boolean;
  maxLength?: number;
  onBlur?: () => void;
  testID?: string;
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  hint,
  keyboardType,
  autoCapitalize = 'none',
  autoComplete,
  secureTextEntry = false,
  editable = true,
  maxLength,
  onBlur,
  testID,
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const border = error ? BORDER.error : focused ? BORDER.focused : BORDER.default;

  return (
    <View className="gap-1">
      <Text className="text-sm text-ink-600">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
        placeholder={placeholder}
        placeholderTextColor={colors.ink[400]}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        secureTextEntry={secureTextEntry}
        editable={editable}
        maxLength={maxLength}
        testID={testID}
        accessibilityLabel={label}
        accessibilityState={{ disabled: !editable }}
        style={{ minHeight: MIN_TAP_TARGET }}
        className={cn(BASE, border, !editable && 'bg-surface-2 text-ink-400')}
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" className="text-sm text-danger-600">
          {error}
        </Text>
      ) : (
        hint && <Text className="text-sm text-ink-400">{hint}</Text>
      )}
    </View>
  );
}
