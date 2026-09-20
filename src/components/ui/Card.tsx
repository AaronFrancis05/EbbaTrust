import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { cn } from '@/lib/cn';
import { MIN_TAP_TARGET } from '@/lib/theme/tokens';

/** ui-registry.md "Card": hairline border, no shadow. Shadows are for sheets and modals. */
const BASE = 'rounded-xl border border-border bg-surface p-4';

export interface CardProps {
  children: ReactNode;
  /** Optional heading rendered at card-title scale, so callers don't re-invent it. */
  title?: string;
  /** Makes the whole card a single tap target. Requires `accessibilityLabel`. */
  onPress?: () => void;
  accessibilityLabel?: string;
  /**
   * Layout-only escape hatch (`gap-*`, `mt-*`, `flex-1`). Never colour, radius or padding —
   * those come from the card itself. A token value here is a `/review` finding.
   */
  className?: string;
  testID?: string;
}

export function Card({
  children,
  title,
  onPress,
  accessibilityLabel,
  className,
  testID,
}: CardProps) {
  const body = (
    <>
      {title && <Text className="text-lg font-medium text-ink-900">{title}</Text>}
      {children}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        testID={testID}
        style={{ minHeight: MIN_TAP_TARGET }}
        className={cn(BASE, 'active:bg-surface-2', className)}
      >
        {body}
      </Pressable>
    );
  }

  return (
    <View testID={testID} className={cn(BASE, className)}>
      {body}
    </View>
  );
}
