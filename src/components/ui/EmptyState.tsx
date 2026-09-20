import { AlertTriangle, SearchX } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Button } from './Button';
import { cn } from '@/lib/cn';
import { colors } from '@/lib/theme/tokens';

/**
 * The "there is nothing here" and "this failed" screen state.
 *
 * Both tones live in one component on purpose. ui-registry.md rule 4 requires every
 * component to handle empty and error, and the two differ only in wording, icon colour and
 * whether the action is a retry — not in layout. Keeping them together stops the error case
 * from quietly going missing.
 *
 * An error tone always offers an action. AGENTS.md 4.5: a silent failure in this app can
 * read as a successful verification, so a failure must be visible and recoverable.
 */

export type EmptyStateTone = 'empty' | 'error';

const ICON_COLOR: Record<EmptyStateTone, string> = {
  empty: colors.ink[400],
  error: colors.danger[600],
};

const DEFAULT_ICON: Record<EmptyStateTone, LucideIcon> = {
  empty: SearchX,
  error: AlertTriangle,
};

const TITLE_COLOR: Record<EmptyStateTone, string> = {
  empty: 'text-ink-900',
  error: 'text-danger-600',
};

export interface EmptyStateProps {
  title: string;
  /** What the user can do about it. Not an apology, and never a raw error string. */
  message: string;
  tone?: EmptyStateTone;
  icon?: LucideIcon;
  action?: { label: string; onPress: () => void };
  testID?: string;
}

export function EmptyState({
  title,
  message,
  tone = 'empty',
  icon,
  action,
  testID,
}: EmptyStateProps) {
  const Icon = icon ?? DEFAULT_ICON[tone];

  return (
    <View testID={testID} className="items-center gap-3 px-4 py-8">
      <Icon size={32} color={ICON_COLOR[tone]} />
      <Text className={cn('text-lg font-medium', TITLE_COLOR[tone])}>{title}</Text>
      <Text className="text-center text-base text-ink-600">{message}</Text>
      {action && (
        <View className="pt-1">
          <Button label={action.label} onPress={action.onPress} variant="secondary" />
        </View>
      )}
    </View>
  );
}
