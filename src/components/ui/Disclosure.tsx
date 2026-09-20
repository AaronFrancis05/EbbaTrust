import { useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { ChevronDown } from 'lucide-react-native';

import { cn } from '@/lib/cn';
import { colors, MIN_TAP_TARGET } from '@/lib/theme/tokens';

/**
 * A single collapsible section — encumbrances, transfer history, fee breakdown.
 *
 * Collapsed by default, because these sections carry detail a buyer needs on demand but
 * should not have to scroll past. The summary line stays visible either way, so nothing
 * that changes a purchase decision is ever hidden behind a tap alone.
 *
 * Only the chevron animates. Height animation on Android needs `LayoutAnimation`, whose
 * behaviour on the new architecture is inconsistent; a rotating chevron communicates the
 * same thing and cannot glitch the layout.
 */
export interface DisclosureProps {
  title: string;
  /** Optional one-line summary shown next to the title while collapsed and expanded. */
  summary?: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  testID?: string;
}

export function Disclosure({
  title,
  summary,
  children,
  defaultExpanded = false,
  testID,
}: DisclosureProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  // Lazy state initialiser rather than a ref: the value is read while rendering.
  const [rotation] = useState(() => new Animated.Value(defaultExpanded ? 1 : 0));

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    Animated.timing(rotation, {
      toValue: next ? 1 : 0,
      duration: 160,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View testID={testID} className="rounded-xl border border-border bg-surface">
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded }}
        style={{ minHeight: MIN_TAP_TARGET }}
        className="flex-row items-center justify-between gap-3 p-4 active:bg-surface-2"
      >
        <View className="flex-1 gap-1">
          <Text className="text-lg font-medium text-ink-900">{title}</Text>
          {summary && <Text className="text-sm text-ink-600">{summary}</Text>}
        </View>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <ChevronDown size={20} color={colors.ink[600]} />
        </Animated.View>
      </Pressable>
      {expanded && (
        <View className={cn('gap-3 px-4 pb-4')}>
          <View className="h-px bg-border" />
          {children}
        </View>
      )}
    </View>
  );
}
