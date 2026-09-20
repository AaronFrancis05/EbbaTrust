import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { cn } from '@/lib/cn';
import { colors, MIN_TAP_TARGET } from '@/lib/theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive';

/**
 * Container classes per variant. Flat literal strings so `/imprint` reads them verbatim.
 * ui-registry.md "Button primary / secondary / destructive".
 */
const CONTAINER: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 active:bg-brand-900',
  secondary: 'bg-surface border border-border active:bg-surface-2',
  destructive: 'bg-danger-600 active:bg-danger-900',
};

const LABEL: Record<ButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-ink-900',
  destructive: 'text-white',
};

/** Spinner and icon colour must match the label, so they are read from the same token set. */
const CONTENT_COLOR: Record<ButtonVariant, string> = {
  primary: colors.surface.DEFAULT,
  secondary: colors.ink[900],
  destructive: colors.surface.DEFAULT,
};

const BASE = 'flex-row items-center justify-center gap-2 rounded-lg px-4 py-3';
const DISABLED_CONTAINER = 'bg-surface-2 border border-border';
const DISABLED_LABEL = 'text-ink-400';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** Shows a spinner and blocks presses. Use for an in-flight action, never for page load. */
  loading?: boolean;
  disabled?: boolean;
  icon?: LucideIcon;
  /** Defaults to `label`. Override only when the label alone is ambiguous out of context. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon: Icon,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      testID={testID}
      style={{ minHeight: MIN_TAP_TARGET }}
      className={cn(BASE, inactive ? DISABLED_CONTAINER : CONTAINER[variant])}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={inactive ? colors.ink[400] : CONTENT_COLOR[variant]}
        />
      ) : (
        Icon && (
          <View accessible={false}>
            <Icon size={18} color={inactive ? colors.ink[400] : CONTENT_COLOR[variant]} />
          </View>
        )
      )}
      <Text
        className={cn(
          'text-base font-medium',
          inactive ? DISABLED_LABEL : LABEL[variant]
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}
